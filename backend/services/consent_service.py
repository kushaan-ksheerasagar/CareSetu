"""
CareSetu Consent Service
Enforces patient and guardian consent tracking, location coordinate sharing controls,
and tamper-evident cryptographic item signatures.

Core Principle: "AI coordinates. Humans authorize."
"""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from backend.models.pharmacy import MedicineItemModel
from backend.models.order import ApprovalRecord, AuditLogEntry

logger = logging.getLogger("caresetu.services.consent")

class ConsentService:
    @staticmethod
    def compute_cart_signature(items: List[MedicineItemModel], total_price: float) -> str:
        """
        Creates a deterministic SHA-256 hash representing the exact items,
        pack sizes, quantities, and total cost of the order.
        Any modification to items or pricing invalidates this signature.
        """
        normalized_items = []
        for it in sorted(items, key=lambda x: x.medicine_id):
            normalized_items.append({
                "id": it.medicine_id,
                "name": it.name,
                "pack_size": it.pack_size,
                "quantity": it.quantity_packs,
                "unit_price": it.price_per_pack,
                "total_price": it.total_price,
                "is_sr": it.is_sustained_release
            })
        
        payload = {
            "items": normalized_items,
            "total": round(total_price, 2)
        }
        encoded = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    @classmethod
    def record_approval(
        cls,
        order_id: str,
        authorized_by: str,
        role: str, # "patient" or "guardian"
        decision: str, # "approved" or "rejected"
        order_version: int,
        items: List[MedicineItemModel],
        total_price: float,
        notes: Optional[str] = None
    ) -> ApprovalRecord:
        """
        Records human authorization tied to an immutable item signature and order version.
        """
        sig = cls.compute_cart_signature(items, total_price)
        record = ApprovalRecord(
            approval_id=f"APP-{hashlib.md5(f'{order_id}-{order_version}-{datetime.now(timezone.utc).isoformat()}'.encode()).hexdigest()[:8]}",
            authorized_by=authorized_by,
            role=role,
            decision=decision,
            order_version=order_version,
            item_signature=sig,
            authorized_at=datetime.now(timezone.utc).isoformat(),
            notes=notes
        )
        logger.info(f"Recorded consent approval: {record.approval_id} by {authorized_by} ({role}) for order {order_id} v{order_version}")
        return record

    @classmethod
    def verify_approval_validity(
        cls,
        approval: ApprovalRecord,
        current_version: int,
        current_items: List[MedicineItemModel],
        current_total: float
    ) -> Tuple[bool, Optional[str]]:
        """
        Verifies whether an existing approval is still valid or has been invalidated by cart changes.
        """
        if approval.order_version != current_version:
            return (False, f"Approval was granted for order version {approval.order_version}, but current version is {current_version}.")
        
        current_sig = cls.compute_cart_signature(current_items, current_total)
        if approval.item_signature != current_sig:
            return (False, "Order items, pack sizes, or prices have changed since authorization. Re-approval required.")
        
        return (True, None)

    @staticmethod
    def validate_location_sharing_consent(
        patient_consent_granted: bool,
        purpose: str = "pharmacy_delivery"
    ) -> bool:
        """
        Guards patient location privacy.
        Exact coordinates may only be transmitted when explicit consent is on record.
        """
        if not patient_consent_granted:
            logger.warning(f"Location sharing blocked: patient consent not granted for purpose '{purpose}'. Using pincode only.")
            return False
        return True
