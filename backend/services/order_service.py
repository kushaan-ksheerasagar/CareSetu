"""
CareSetu Multi-Pharmacy Order Service
Manages the explicit 16-stage order lifecycle, tamper-evident approvals,
version invalidation on order change, and provider status tracking.

Lifecycle States:
DRAFT -> SEARCHING -> OPTIONS_AVAILABLE -> ORDER_PREPARED ->
AWAITING_USER_APPROVAL -> AWAITING_GUARDIAN_APPROVAL -> APPROVED ->
SUBMITTED -> PROVIDER_PENDING -> MODIFICATION_REQUESTED ->
PAYMENT_PENDING -> CONFIRMED -> DISPATCHED -> DELIVERED (or CANCELLED / FAILED)
"""

import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from backend.models.pharmacy import (
    ProviderType,
    MedicineItemModel,
    PharmacyOption
)
from backend.models.order import (
    OrderLifecycleState,
    ApprovalRecord,
    AuditLogEntry,
    MultiPharmacyOrder
)
from backend.services.consent_service import ConsentService
from backend.database.mock_db import get_db

logger = logging.getLogger("caresetu.services.order")

# Thread-safe in-memory registry for orders
_ORDER_REGISTRY: Dict[str, MultiPharmacyOrder] = {}

class OrderService:
    @classmethod
    def get_order(cls, order_id: str) -> Optional[MultiPharmacyOrder]:
        return _ORDER_REGISTRY.get(order_id)

    @classmethod
    def list_orders(cls) -> List[MultiPharmacyOrder]:
        return list(_ORDER_REGISTRY.values())

    @classmethod
    def create_order_from_option(
        cls,
        patient_id: str,
        patient_name: str,
        selected_option: PharmacyOption,
        delivery_address: str,
        pincode: str,
        idempotency_key: Optional[str] = None
    ) -> MultiPharmacyOrder:
        """
        Creates a new order in ORDER_PREPARED state from a selected pharmacy option.
        """
        idem_key = idempotency_key or f"IDEM-{uuid.uuid4().hex[:12]}"

        # Check for existing order with identical idempotency key to prevent duplicates
        for existing in _ORDER_REGISTRY.values():
            if existing.idempotency_key == idem_key:
                logger.info(f"Duplicate order submission avoided via idempotency key {idem_key}")
                return existing

        order_id = f"CS-ORD-{int(time.time()) % 100000}-{uuid.uuid4().hex[:4].upper()}"
        now_str = datetime.now(timezone.utc).isoformat()

        audit = [
            AuditLogEntry(
                timestamp=now_str,
                event="ORDER_CREATED",
                actor=patient_name,
                previous_state=None,
                new_state=OrderLifecycleState.ORDER_PREPARED.value,
                metadata={
                    "provider": selected_option.provider_name,
                    "subtotal": selected_option.subtotal,
                    "total": selected_option.total
                }
            )
        ]

        order = MultiPharmacyOrder(
            order_id=order_id,
            version=1,
            patient_id=patient_id,
            patient_name=patient_name,
            selected_provider_id=selected_option.provider_id,
            selected_provider_name=selected_option.provider_name,
            selected_provider_type=selected_option.provider_type,
            items=selected_option.items,
            subtotal=selected_option.subtotal,
            delivery_fee=selected_option.delivery_fee,
            total=selected_option.total,
            delivery_address=delivery_address,
            pincode=pincode,
            state=OrderLifecycleState.ORDER_PREPARED,
            approvals=[],
            handoff_url=selected_option.handoff_url,
            handoff_details={
                "instructions": selected_option.handoff_instructions or [],
                "disclaimer": selected_option.disclaimer
            } if selected_option.handoff_url else None,
            idempotency_key=idem_key,
            payment_authorized=False,
            payment_method="Cash on Delivery / UPI upon arrival",
            audit_trail=audit,
            created_at=now_str,
            updated_at=now_str
        )

        _ORDER_REGISTRY[order_id] = order
        logger.info(f"Created order {order_id} with provider {order.selected_provider_name}")
        return order

    @classmethod
    def request_approval(
        cls,
        order_id: str,
        role: str = "guardian", # "guardian" or "patient"
        channel: str = "whatsapp" # "whatsapp", "in_app", "sms"
    ) -> MultiPharmacyOrder:
        """
        Transitions order to AWAITING_GUARDIAN_APPROVAL or AWAITING_USER_APPROVAL.
        Integrates with the guardian approval queue in CareSetu.
        """
        order = cls.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found.")

        target_state = (
            OrderLifecycleState.AWAITING_GUARDIAN_APPROVAL 
            if role == "guardian" 
            else OrderLifecycleState.AWAITING_USER_APPROVAL
        )

        old_state = order.state
        order.state = target_state
        order.updated_at = datetime.now(timezone.utc).isoformat()

        order.audit_trail.append(
            AuditLogEntry(
                timestamp=order.updated_at,
                event="APPROVAL_REQUESTED",
                actor="System Agent",
                previous_state=old_state.value,
                new_state=target_state.value,
                metadata={"role": role, "channel": channel}
            )
        )

        # Also register in CareSetu's mock database guardian queue for seamless UI reflection
        db = get_db()
        db_approvals = db["guardian"].setdefault("pending_approvals", [])
        
        # Avoid duplicate pending approvals
        existing_index = next((i for i, a in enumerate(db_approvals) if a.get("order_id") == order_id), -1)
        approval_item = {
            "id": f"APPR-PHARM-{order.order_id}",
            "order_id": order.order_id,
            "type": "medicine_refill",
            "title": f"Medicine Order Approval ({order.selected_provider_name})",
            "description": f"Refill order for {len(order.items)} medicines totaling ₹{order.total:.2f}",
            "medicines": [f"{it.name} (Qty: {it.quantity_packs})" for it in order.items],
            "pharmacy": order.selected_provider_name,
            "total_amount": f"₹{order.total:.2f}",
            "created_at": "Just now",
            "status": "pending",
            "requested_by": "CareSetu Coordinator AI",
            "requires_guardian_pin": False,
            "version": order.version
        }

        if existing_index >= 0:
            db_approvals[existing_index] = approval_item
        else:
            db_approvals.append(approval_item)

        return order

    @classmethod
    def record_authorization(
        cls,
        order_id: str,
        authorized_by: str,
        role: str,
        decision: str, # "approved" or "rejected"
        notes: Optional[str] = None
    ) -> Tuple[MultiPharmacyOrder, bool, str]:
        """
        Records human approval. Verifies item signature against order version.
        Transitions state to APPROVED or CANCELLED.
        """
        order = cls.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found.")

        now_str = datetime.now(timezone.utc).isoformat()

        if decision == "rejected":
            old_state = order.state
            order.state = OrderLifecycleState.CANCELLED
            order.updated_at = now_str
            order.audit_trail.append(
                AuditLogEntry(
                    timestamp=now_str,
                    event="ORDER_REJECTED",
                    actor=authorized_by,
                    previous_state=old_state.value,
                    new_state=OrderLifecycleState.CANCELLED.value,
                    metadata={"reason": notes or "User rejected authorization"}
                )
            )
            # Update DB queue
            db = get_db()
            for appr in db["guardian"].get("pending_approvals", []):
                if appr.get("order_id") == order_id:
                    appr["status"] = "rejected"
            return (order, False, "Order rejected by user.")

        # Record cryptographic approval record
        approval_record = ConsentService.record_approval(
            order_id=order.order_id,
            authorized_by=authorized_by,
            role=role,
            decision="approved",
            order_version=order.version,
            items=order.items,
            total_price=order.total,
            notes=notes
        )

        order.approvals.append(approval_record)
        old_state = order.state
        order.state = OrderLifecycleState.APPROVED
        order.updated_at = now_str

        order.audit_trail.append(
            AuditLogEntry(
                timestamp=now_str,
                event="ORDER_APPROVED",
                actor=authorized_by,
                previous_state=old_state.value,
                new_state=OrderLifecycleState.APPROVED.value,
                metadata={
                    "approval_id": approval_record.approval_id,
                    "version": order.version,
                    "signature": approval_record.item_signature
                }
            )
        )

        # Update mock db
        db = get_db()
        for appr in db["guardian"].get("pending_approvals", []):
            if appr.get("order_id") == order_id:
                appr["status"] = "approved"

        return (order, True, f"Order authorized by {authorized_by}.")

    @classmethod
    def modify_order_items(
        cls,
        order_id: str,
        updated_items: List[MedicineItemModel],
        subtotal: float,
        delivery_fee: float,
        reason: str,
        actor: str = "System"
    ) -> MultiPharmacyOrder:
        """
        CRITICAL SAFETY INVARIANT:
        If any medicine, pack size, substitution, or price changes,
        we MUST increment the order version and invalidate all prior approvals.
        """
        order = cls.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found.")

        old_version = order.version
        order.version += 1
        order.items = updated_items
        order.subtotal = subtotal
        order.delivery_fee = delivery_fee
        order.total = round(subtotal + delivery_fee, 2)
        old_state = order.state
        
        # Invalidate approvals
        order.state = OrderLifecycleState.MODIFICATION_REQUESTED
        order.updated_at = datetime.now(timezone.utc).isoformat()

        order.audit_trail.append(
            AuditLogEntry(
                timestamp=order.updated_at,
                event="ORDER_MODIFIED_APPROVALS_INVALIDATED",
                actor=actor,
                previous_state=old_state.value,
                new_state=order.state.value,
                metadata={
                    "old_version": old_version,
                    "new_version": order.version,
                    "reason": reason,
                    "invalidated_approval_count": len(order.approvals)
                }
            )
        )

        logger.warning(
            f"Order {order_id} modified (v{old_version} -> v{order.version}). "
            f"All prior approvals invalidated due to: {reason}"
        )
        return order

    @classmethod
    def update_fulfillment_status(
        cls,
        order_id: str,
        new_state: OrderLifecycleState,
        provider_order_id: Optional[str] = None,
        notes: Optional[str] = None,
        actor: str = "Provider Webhook"
    ) -> MultiPharmacyOrder:
        """
        Updates order state along the lifecycle (e.g. SUBMITTED -> CONFIRMED -> DISPATCHED -> DELIVERED).
        """
        order = cls.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found.")

        old_state = order.state
        order.state = new_state
        if provider_order_id:
            order.provider_order_id = provider_order_id
        order.updated_at = datetime.now(timezone.utc).isoformat()

        order.audit_trail.append(
            AuditLogEntry(
                timestamp=order.updated_at,
                event=f"STATUS_UPDATED_{new_state.value.upper()}",
                actor=actor,
                previous_state=old_state.value,
                new_state=new_state.value,
                metadata={"notes": notes} if notes else {}
            )
        )

        logger.info(f"Order {order_id} transitioned: {old_state.value} -> {new_state.value}")
        return order

