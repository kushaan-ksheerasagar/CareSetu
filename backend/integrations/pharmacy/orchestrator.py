"""
CareSetu Multi-Pharmacy Orchestrator
Aggregates, coordinates, and normalizes queries across multiple pharmacy providers.
Supports direct API integrations (eVitalRx, MedPay), disabled partner placeholders,
and app-navigation fallbacks (Tata 1mg, Apollo 24/7).
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional

from backend.integrations.pharmacy.base import BasePharmacyAdapter
from backend.integrations.pharmacy.evitalrx import EVitalRxAdapter
from backend.integrations.pharmacy.medpay import MedPayAdapter
from backend.integrations.pharmacy.tata_1mg import Tata1mgAdapter
from backend.integrations.pharmacy.app_navigation import AppNavigationAdapter
from backend.models.pharmacy import (
    ProviderType,
    ProviderCapability,
    MedicineItemModel,
    PharmacyOption,
    PharmacyComparisonResult,
    ServiceabilityResult
)
from backend.models.order import MultiPharmacyOrder, OrderLifecycleState
from backend.services.pharmacy_comparison import PharmacyComparisonService
from backend.services.order_service import OrderService

logger = logging.getLogger("caresetu.pharmacy.orchestrator")

class PharmacyOrchestrator:
    """
    Coordinates multi-pharmacy discovery, comparison, pricing, and submission.
    Ensures safe, non-blocking parallel provider queries with error isolation.
    """
    def __init__(self):
        # Register available adapters
        self.adapters: Dict[str, BasePharmacyAdapter] = {
            "evitalrx": EVitalRxAdapter(),
            "medpay": MedPayAdapter(),
            "tata_1mg": Tata1mgAdapter(),
            "app_nav_tata_1mg": AppNavigationAdapter(platform_key="tata_1mg"),
            "app_nav_apollo": AppNavigationAdapter(platform_key="apollo_pharmacy")
        }

    def get_adapter(self, provider_id: str) -> Optional[BasePharmacyAdapter]:
        return self.adapters.get(provider_id)

    def list_providers(self) -> List[Dict[str, Any]]:
        """Returns metadata and configuration status for all known providers."""
        return [
            {
                "id": adapter.provider_id,
                "name": adapter.provider_name,
                "type": adapter.provider_type.value,
                "is_configured": adapter.is_configured(),
                "integration_status": adapter.get_integration_status().value,
                "capabilities": [c.value for c in adapter.capabilities]
            }
            for adapter in self.adapters.values()
        ]

    async def check_serviceability_all(self, pincode: str) -> List[ServiceabilityResult]:
        """Checks serviceability across all active providers in parallel."""
        tasks = []
        keys = []
        for key, adapter in self.adapters.items():
            if adapter.supports(ProviderCapability.SERVICEABILITY) and adapter.provider_type != ProviderType.DISABLED_PARTNER:
                tasks.append(adapter.check_serviceability(pincode))
                keys.append(key)

        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid_results: List[ServiceabilityResult] = []

        for key, res in zip(keys, results):
            if isinstance(res, Exception):
                logger.warning(f"Serviceability check failed for {key}: {res}")
            elif isinstance(res, ServiceabilityResult):
                valid_results.append(res)

        return valid_results

    async def compare_pharmacies(
        self,
        medicines: List[Dict[str, Any]],
        pincode: str = "560003",
        delivery_address: str = "42/1, 8th Cross, Malleshwaram, Bengaluru, Karnataka"
    ) -> PharmacyComparisonResult:
        """
        Gathers quotes from all active providers, normalizes pricing,
        detects substitutions, and ranks options for the patient/guardian.
        """
        tasks = []
        provider_keys = []

        for key, adapter in self.adapters.items():
            # Skip disabled partner stubs during active comparison
            if adapter.provider_type == ProviderType.DISABLED_PARTNER:
                continue

            if adapter.supports(ProviderCapability.ORDER_PREPARATION):
                tasks.append(
                    asyncio.wait_for(
                        adapter.prepare_order(medicines, delivery_address, pincode),
                        timeout=14.0
                    )
                )
                provider_keys.append(key)

        results = await asyncio.gather(*tasks, return_exceptions=True)
        options: List[PharmacyOption] = []

        for key, res in zip(provider_keys, results):
            if isinstance(res, Exception):
                logger.error(f"Error querying pharmacy provider {key}: {res}")
            elif isinstance(res, PharmacyOption):
                options.append(res)

        med_names = [m.get("name", "Medicine") for m in medicines]
        comparison = PharmacyComparisonService.compare_options(
            query_medicines=med_names,
            pincode=pincode,
            options=options
        )

        return comparison

    async def submit_authorized_order(
        self,
        order_id: str,
        authorized_by: str = "Ramachandra Rao",
        role: str = "patient"
    ) -> Dict[str, Any]:
        """
        Submits an authorized order to the selected pharmacy provider adapter.
        """
        order = OrderService.get_order(order_id)
        if not order:
            return {"success": False, "error": f"Order {order_id} not found."}

        # Validate that order has been approved
        if order.state not in (OrderLifecycleState.APPROVED, OrderLifecycleState.ORDER_PREPARED):
            return {
                "success": False,
                "error": f"Order is in state '{order.state.value}'. Only approved orders may be submitted."
            }

        adapter = self.get_adapter(order.selected_provider_id)
        if not adapter:
            return {
                "success": False,
                "error": f"Provider adapter '{order.selected_provider_id}' is not registered."
            }

        # Transition state to SUBMITTED
        OrderService.update_fulfillment_status(
            order_id=order_id,
            new_state=OrderLifecycleState.SUBMITTED,
            actor=authorized_by,
            notes=f"Order submitted to {order.selected_provider_name}"
        )

        try:
            submission_result = await adapter.submit_order(order)
            if submission_result.get("success"):
                provider_ref = submission_result.get("provider_order_id")
                # Transition to CONFIRMED
                OrderService.update_fulfillment_status(
                    order_id=order_id,
                    new_state=OrderLifecycleState.CONFIRMED,
                    provider_order_id=provider_ref,
                    actor=order.selected_provider_name,
                    notes=submission_result.get("message")
                )
                return {
                    "success": True,
                    "order": order.model_dump(),
                    "submission": submission_result
                }
            else:
                OrderService.update_fulfillment_status(
                    order_id=order_id,
                    new_state=OrderLifecycleState.FAILED,
                    actor=order.selected_provider_name,
                    notes=submission_result.get("error", "Submission rejected by provider.")
                )
                return submission_result
        except Exception as e:
            logger.error(f"Error submitting order {order_id} to provider {adapter.provider_id}: {e}")
            OrderService.update_fulfillment_status(
                order_id=order_id,
                new_state=OrderLifecycleState.FAILED,
                actor="System Orchestrator",
                notes=str(e)
            )
            return {"success": False, "error": str(e)}

    async def get_order_tracking(self, order_id: str) -> Dict[str, Any]:
        """Retrieves tracking info for an active order."""
        order = OrderService.get_order(order_id)
        if not order:
            return {"error": f"Order {order_id} not found."}

        if not order.provider_order_id:
            return {
                "order_id": order_id,
                "state": order.state.value,
                "provider": order.selected_provider_name,
                "message": "Order is prepared or awaiting provider dispatch."
            }

        adapter = self.get_adapter(order.selected_provider_id)
        if adapter and adapter.supports(ProviderCapability.ORDER_TRACKING):
            provider_status = await adapter.get_order_status(order.provider_order_id)
            return {
                "order_id": order_id,
                "state": order.state.value,
                "provider": order.selected_provider_name,
                "provider_tracking": provider_status
            }

        return {
            "order_id": order_id,
            "state": order.state.value,
            "provider": order.selected_provider_name,
            "message": "Tracking currently updated via partner SMS notifications."
        }

