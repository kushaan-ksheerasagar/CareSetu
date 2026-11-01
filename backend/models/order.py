"""
CareSetu Multi-Pharmacy Order Models
Encapsulates explicit 16-stage order lifecycle, approvals, and tamper-resistant audit logs.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from backend.models.pharmacy import MedicineItemModel, ProviderType

class OrderLifecycleState(str, Enum):
    DRAFT = "draft"
    SEARCHING = "searching"
    OPTIONS_AVAILABLE = "options_available"
    ORDER_PREPARED = "order_prepared"
    AWAITING_USER_APPROVAL = "awaiting_user_approval"
    AWAITING_GUARDIAN_APPROVAL = "awaiting_guardian_approval"
    APPROVED = "approved"
    SUBMITTED = "submitted"
    PROVIDER_PENDING = "provider_pending"
    MODIFICATION_REQUESTED = "modification_requested"
    PAYMENT_PENDING = "payment_pending"
    CONFIRMED = "confirmed"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    FAILED = "failed"

class ApprovalRecord(BaseModel):
    approval_id: str
    authorized_by: str
    role: str # "patient" or "guardian"
    decision: str # "approved" or "rejected"
    order_version: int
    item_signature: str # Hash of items to detect tampering/modifications
    authorized_at: str
    notes: Optional[str] = None

class AuditLogEntry(BaseModel):
    timestamp: str
    event: str
    actor: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class MultiPharmacyOrder(BaseModel):
    order_id: str
    version: int = 1
    patient_id: str = "PAT-72-BLR"
    patient_name: str = "Sri Ramachandra Rao"
    selected_provider_id: str
    selected_provider_name: str
    selected_provider_type: ProviderType
    items: List[MedicineItemModel]
    subtotal: float
    delivery_fee: float
    total: float
    delivery_address: str
    pincode: str = "560003"
    state: OrderLifecycleState = OrderLifecycleState.DRAFT
    approvals: List[ApprovalRecord] = Field(default_factory=list)
    provider_order_id: Optional[str] = None
    handoff_url: Optional[str] = None
    handoff_details: Optional[Dict[str, Any]] = None
    idempotency_key: str
    payment_authorized: bool = False
    payment_method: str = "Cash on Delivery / UPI upon arrival"
    audit_trail: List[AuditLogEntry] = Field(default_factory=list)
    created_at: str
    updated_at: str

