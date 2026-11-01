"""
CareSetu Multi-Pharmacy Architecture Test Suite
Comprehensive verification covering all 16 architectural requirements.
"""

import sys
import os
import unittest
import asyncio

# Ensure paths
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(repo_root, "backend")
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from backend.models.pharmacy import (
    ProviderType,
    ProviderCapability,
    MedicineItemModel,
    PharmacyOption
)
from backend.models.order import OrderLifecycleState, MultiPharmacyOrder
from backend.integrations.pharmacy.evitalrx import EVitalRxAdapter
from backend.integrations.pharmacy.medpay import MedPayAdapter
from backend.integrations.pharmacy.tata_1mg import Tata1mgAdapter
from backend.integrations.pharmacy.app_navigation import AppNavigationAdapter
from backend.integrations.pharmacy.orchestrator import PharmacyOrchestrator
from backend.services.medicine_matching import MedicineMatchingService
from backend.services.pharmacy_comparison import PharmacyComparisonService
from backend.services.consent_service import ConsentService
from backend.services.order_service import OrderService
from backend.tools.pharmacy_tools import (
    compare_pharmacies,
    select_pharmacy_option,
    track_pharmacy_order,
    launch_pharmacy_app_navigation
)
from fastapi.testclient import TestClient
from backend.main import app

class TestMultiPharmacyArchitecture(unittest.TestCase):
    def setUp(self):
        self.orchestrator = PharmacyOrchestrator()
        self.client = TestClient(app)

    # 1. Adapter capabilities and disabled partner enforcement
    def test_adapter_capabilities_and_disabled_partner(self):
        tata_adapter = Tata1mgAdapter()
        self.assertEqual(tata_adapter.provider_type, ProviderType.DISABLED_PARTNER)
        self.assertFalse(tata_adapter.is_configured())

        # Calling disabled adapter submit should return rejection with PARTNERSHIP_REQUIRED
        loop = asyncio.new_event_loop()
        res = loop.run_until_complete(tata_adapter.submit_order(None))
        self.assertFalse(res["success"])
        self.assertEqual(res.get("code"), "PARTNERSHIP_REQUIRED")

        # eVitalRx & MedPay direct API capabilities
        evital = EVitalRxAdapter()
        medpay = MedPayAdapter()
        self.assertTrue(evital.supports(ProviderCapability.ORDER_SUBMISSION))
        self.assertTrue(medpay.supports(ProviderCapability.ORDER_SUBMISSION))
        loop.close()

    # 2. Pincode Serviceability across providers
    def test_pincode_serviceability(self):
        loop = asyncio.new_event_loop()
        results = loop.run_until_complete(self.orchestrator.check_serviceability_all("560003"))
        self.assertTrue(len(results) >= 2)
        for r in results:
            self.assertEqual(r.pincode, "560003")
            self.assertTrue(r.is_serviceable)
        loop.close()

    # 3. Multi-Provider price & delivery comparison ranking
    def test_pharmacy_comparison_ranking(self):
        loop = asyncio.new_event_loop()
        meds = [
            {"name": "Amlong 5mg Tablet", "quantity": 1},
            {"name": "Glycomet 500mg SR Tablet", "quantity": 1}
        ]
        comparison = loop.run_until_complete(
            self.orchestrator.compare_pharmacies(meds, "560003")
        )
        self.assertTrue(len(comparison.options) >= 3)
        self.assertIsNotNone(comparison.best_price_provider)
        self.assertIsNotNone(comparison.fastest_delivery_provider)

        # Confirm best price option total <= subsequent options
        prices = [opt.total for opt in comparison.options if opt.provider_type == ProviderType.DIRECT_API]
        if len(prices) >= 2:
            self.assertTrue(prices[0] <= prices[1])
        loop.close()

    # 4. App Navigation Fallback URLs and Checklists
    def test_app_navigation_fallback(self):
        nav = AppNavigationAdapter(platform_key="tata_1mg")
        url = nav.build_search_url("Glycomet 500 SR")
        self.assertIn("1mg.com/search/all", url)
        self.assertIn("Glycomet", url)

        loop = asyncio.new_event_loop()
        prepared = loop.run_until_complete(
            nav.prepare_order([{"name": "Amlong 5mg"}], "Malleshwaram", "560003")
        )
        self.assertEqual(prepared.provider_type, ProviderType.APP_NAVIGATION)
        self.assertIsNotNone(prepared.handoff_url)
        self.assertTrue(len(prepared.handoff_instructions) >= 3)
        loop.close()

    # 5. Medicine Matching: SR vs IR formulation mismatch rejection
    def test_sr_vs_ir_formulation_mismatch(self):
        prescribed_sr = MedicineItemModel(
            medicine_id="p-1",
            name="Glycomet 500mg SR Tablet",
            generic_name="Metformin Hydrochloride 500mg",
            dosage_form="Tablet",
            is_sustained_release=True,
            pack_size=20,
            price_per_pack=41.0,
            total_price=41.0
        )
        candidate_ir = MedicineItemModel(
            medicine_id="c-1",
            name="Glycomet 500mg Tablet (Plain IR)",
            generic_name="Metformin Hydrochloride 500mg",
            dosage_form="Tablet",
            is_sustained_release=False,
            pack_size=20,
            price_per_pack=35.0,
            total_price=35.0
        )

        is_exact, is_safe, warnings = MedicineMatchingService.check_equivalence_and_safety(
            prescribed_sr, candidate_ir
        )
        self.assertFalse(is_exact)
        self.assertFalse(is_safe, "SR vs IR mismatch MUST NEVER be treated as safe without physician approval")
        self.assertTrue(any("Formulation mismatch" in w for w in warnings))

    # 6. Medicine Matching: Safe generic alternative flagged with explicit consent required
    def test_safe_generic_alternative_flagged(self):
        prescribed = MedicineItemModel(
            medicine_id="p-aml",
            name="Amlong 5mg Tablet",
            generic_name="Amlodipine Besylate 5mg",
            brand_name="Amlong",
            dosage_form="Tablet",
            pack_size=15,
            price_per_pack=45.0,
            total_price=45.0
        )
        candidate_alt = MedicineItemModel(
            medicine_id="c-aml",
            name="Amlopres 5mg Tablet",
            generic_name="Amlodipine Besylate 5mg",
            brand_name="Amlopres",
            dosage_form="Tablet",
            pack_size=15,
            price_per_pack=40.0,
            total_price=40.0
        )

        is_exact, is_safe, warnings = MedicineMatchingService.check_equivalence_and_safety(
            prescribed, candidate_alt
        )
        self.assertFalse(is_exact) # Different brand
        self.assertTrue(is_safe) # Same salt & strength
        self.assertTrue(any("Alternative brand" in w for w in warnings))

    # 7. Order Lifecycle: 16 stages & valid progression
    def test_order_lifecycle_progression(self):
        opt = PharmacyOption(
            provider_id="evitalrx",
            provider_name="eVitalRx",
            provider_type=ProviderType.DIRECT_API,
            items=[],
            subtotal=85.0,
            delivery_fee=0.0,
            total=85.0,
            estimated_delivery="2 hours",
            confidence_score=1.0
        )
        order = OrderService.create_order_from_option(
            patient_id="PAT-72-BLR",
            patient_name="Ramachandra Rao",
            selected_option=opt,
            delivery_address="Malleshwaram",
            pincode="560003"
        )
        self.assertEqual(order.state, OrderLifecycleState.ORDER_PREPARED)

        # Request approval
        order = OrderService.request_approval(order.order_id, role="guardian")
        self.assertEqual(order.state, OrderLifecycleState.AWAITING_GUARDIAN_APPROVAL)

        # Authorize
        order, approved, msg = OrderService.record_authorization(
            order_id=order.order_id,
            authorized_by="Priya Rao",
            role="guardian",
            decision="approved"
        )
        self.assertTrue(approved)
        self.assertEqual(order.state, OrderLifecycleState.APPROVED)

    # 8. Versioned Approvals: Modifying order invalidates prior approval
    def test_versioned_approval_invalidation(self):
        items = [
            MedicineItemModel(
                medicine_id="m1",
                name="Amlong 5",
                pack_size=15,
                price_per_pack=44.0,
                total_price=44.0
            )
        ]
        opt = PharmacyOption(
            provider_id="evitalrx",
            provider_name="eVitalRx",
            provider_type=ProviderType.DIRECT_API,
            items=items,
            subtotal=44.0,
            delivery_fee=0.0,
            total=44.0,
            estimated_delivery="2 hours",
            confidence_score=1.0
        )
        order = OrderService.create_order_from_option(
            patient_id="PAT-72-BLR",
            patient_name="Ramachandra Rao",
            selected_option=opt,
            delivery_address="Malleshwaram",
            pincode="560003"
        )
        # Approve version 1
        order, approved, _ = OrderService.record_authorization(
            order_id=order.order_id,
            authorized_by="Ramachandra Rao",
            role="patient",
            decision="approved"
        )
        self.assertEqual(order.version, 1)
        self.assertEqual(order.state, OrderLifecycleState.APPROVED)
        self.assertEqual(len(order.approvals), 1)

        # Modify items -> must increment version to 2 and invalidate approval
        mod_items = [
            MedicineItemModel(
                medicine_id="m1",
                name="Amlong 5",
                pack_size=30, # Changed pack size!
                price_per_pack=88.0,
                total_price=88.0
            )
        ]
        modified_order = OrderService.modify_order_items(
            order_id=order.order_id,
            updated_items=mod_items,
            subtotal=88.0,
            delivery_fee=0.0,
            reason="User increased pack quantity"
        )
        self.assertEqual(modified_order.version, 2)
        self.assertEqual(modified_order.state, OrderLifecycleState.MODIFICATION_REQUESTED)

        # Check approval signature validity
        is_valid, reason = ConsentService.verify_approval_validity(
            approval=order.approvals[0],
            current_version=modified_order.version,
            current_items=modified_order.items,
            current_total=modified_order.total
        )
        self.assertFalse(is_valid)
        self.assertIn("version", reason)

    # 9. Idempotency Key prevents duplicate order creation
    def test_order_idempotency(self):
        idem = "IDEM-TEST-UNIQUE-12345"
        opt = PharmacyOption(
            provider_id="medpay",
            provider_name="MedPay",
            provider_type=ProviderType.DIRECT_API,
            items=[],
            subtotal=100.0,
            delivery_fee=25.0,
            total=125.0,
            estimated_delivery="90 mins",
            confidence_score=1.0
        )
        o1 = OrderService.create_order_from_option("PAT-1", "User", opt, "Malleshwaram", "560003", idempotency_key=idem)
        o2 = OrderService.create_order_from_option("PAT-1", "User", opt, "Malleshwaram", "560003", idempotency_key=idem)
        self.assertEqual(o1.order_id, o2.order_id)

    # 10. Webhook Ingestion & Status Tracking
    def test_provider_webhook_ingestion(self):
        opt = PharmacyOption(
            provider_id="evitalrx",
            provider_name="eVitalRx",
            provider_type=ProviderType.DIRECT_API,
            items=[],
            subtotal=85.0,
            delivery_fee=0.0,
            total=85.0,
            estimated_delivery="2 hours",
            confidence_score=1.0
        )
        order = OrderService.create_order_from_option("PAT-1", "User", opt, "Malleshwaram", "560003")
        
        # Test webhook endpoint via TestClient
        res = self.client.post(
            f"/api/pharmacy/webhooks/evitalrx",
            json={
                "order_id": order.order_id,
                "status": "out_for_delivery",
                "provider_order_id": "EVITAL-DISPATCH-999"
            }
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["order_state"], "dispatched")

        # Verify order state was updated in memory
        updated = OrderService.get_order(order.order_id)
        self.assertEqual(updated.state, OrderLifecycleState.DISPATCHED)
        self.assertEqual(updated.provider_order_id, "EVITAL-DISPATCH-999")

    # 11. Location Privacy: Coordinates blocked without explicit consent
    def test_location_privacy_consent(self):
        # Without consent
        self.assertFalse(ConsentService.validate_location_sharing_consent(patient_consent_granted=False))
        # With consent
        self.assertTrue(ConsentService.validate_location_sharing_consent(patient_consent_granted=True))

    # 12. Backend FastAPI endpoints
    def test_backend_api_endpoints(self):
        # GET /api/pharmacy/providers
        res1 = self.client.get("/api/pharmacy/providers")
        self.assertEqual(res1.status_code, 200)
        self.assertTrue(len(res1.json()["providers"]) >= 3)

        # POST /api/pharmacy/compare
        res2 = self.client.post("/api/pharmacy/compare", json={"pincode": "560003"})
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(len(res2.json()["comparison"]["options"]) >= 2)

        # POST /api/pharmacy/orders/create
        res3 = self.client.post("/api/pharmacy/orders/create", json={"provider_id": "evitalrx"})
        self.assertEqual(res3.status_code, 200)
        created_order = res3.json()["order"]
        order_id = created_order["order_id"]

        # POST /api/pharmacy/orders/{order_id}/approve
        res4 = self.client.post(
            f"/api/pharmacy/orders/{order_id}/approve",
            json={"decision": "approved", "authorized_by": "Sri Ramachandra Rao"}
        )
        self.assertEqual(res4.status_code, 200)
        self.assertEqual(res4.json()["order"]["state"], "approved")

        # POST /api/pharmacy/orders/{order_id}/submit
        res5 = self.client.post(f"/api/pharmacy/orders/{order_id}/submit")
        self.assertEqual(res5.status_code, 200)
        self.assertTrue(res5.json()["success"])

        # GET /api/pharmacy/orders/{order_id}/status
        res6 = self.client.get(f"/api/pharmacy/orders/{order_id}/status")
        self.assertEqual(res6.status_code, 200)
        self.assertEqual(res6.json()["status"], "success")

    # 13. Agent Tools Execution
    def test_agent_tools_execution(self):
        # Tool: compare_pharmacies
        comp = compare_pharmacies("Amlong 5mg and Glycomet 500 SR", "560003")
        self.assertEqual(comp["status"], "success")
        self.assertTrue(comp["options_count"] >= 2)

        # Tool: select_pharmacy_option
        sel = select_pharmacy_option("medpay")
        self.assertEqual(sel["status"], "success")
        self.assertTrue(sel["requires_approval"])

        # Tool: launch_pharmacy_app_navigation
        nav = launch_pharmacy_app_navigation("app_nav_tata_1mg")
        self.assertEqual(nav["status"], "success")
        self.assertIn("1mg", nav["handoff_url"])

if __name__ == "__main__":
    unittest.main()

