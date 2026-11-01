"""
CareSetu Multi-Pharmacy Models
Standardized data contracts for pharmacy providers, medicines, comparison and serviceability.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class IntegrationStatus(str, Enum):
    LIVE_STAGING = "LIVE_STAGING"
    MOCK_DEMO = "MOCK_DEMO"
    DISCONNECTED = "DISCONNECTED"
    ERROR = "ERROR"

class ProviderType(str, Enum):
    DIRECT_API = "direct_api"
    APP_NAVIGATION = "app_navigation"
    DISABLED_PARTNER = "disabled_partner"
    SIMULATED_DEMO = "simulated_demo"

class ProviderCapability(str, Enum):
    SEARCH = "search"
    INVENTORY = "inventory"
    SERVICEABILITY = "serviceability"
    ORDER_PREPARATION = "order_preparation"
    ORDER_SUBMISSION = "order_submission"
    PRESCRIPTION_UPLOAD = "prescription_upload"
    ORDER_TRACKING = "order_tracking"
    ORDER_CANCELLATION = "order_cancellation"
    WEBHOOKS = "webhooks"
    APP_DEEP_LINK = "app_deep_link"

class ServiceabilityResult(BaseModel):
    is_serviceable: bool
    pincode: str
    provider_id: str
    estimated_delivery_time: Optional[str] = None
    delivery_fee: float = 0.0
    min_order_value: float = 0.0
    message: Optional[str] = None
    delivery_tiers: Dict[str, Any] = Field(default_factory=dict)

class MedicineItemModel(BaseModel):
    medicine_id: str
    name: str
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: str = "Tablet" # Tablet, Capsule, Syrup, Injection, Cream
    is_sustained_release: bool = False
    manufacturer: Optional[str] = None
    pack_size: int = 1
    quantity_packs: int = 1
    total_units: int = 1
    price_per_pack: float
    total_price: float
    prescription_required: bool = True
    in_stock: bool = True
    stock_count: Optional[int] = None
    sku_code: Optional[str] = None
    instructions: Optional[str] = None
    is_substitution: bool = False
    substitution_details: Optional[Dict[str, Any]] = None

class PharmacyOption(BaseModel):
    provider_id: str
    provider_name: str
    provider_type: ProviderType
    supported_capabilities: List[ProviderCapability] = Field(default_factory=list)
    items: List[MedicineItemModel]
    subtotal: float
    delivery_fee: float
    total: float
    estimated_delivery: str
    is_serviceable: bool = True
    serviceability_message: Optional[str] = None
    rating: float = 4.5
    requires_prescription: bool = True
    pharmacy_branch: Optional[str] = None
    handoff_url: Optional[str] = None
    handoff_instructions: Optional[List[str]] = None
    disclaimer: Optional[str] = None
    confidence_score: float = 1.0
    integration_status: IntegrationStatus = IntegrationStatus.MOCK_DEMO
    status_message: Optional[str] = None
    delivery_tiers: Dict[str, Any] = Field(default_factory=dict)
    pricing_mode: str = "verified_mrp"
    is_quote_confirmed: bool = False

class PharmacyComparisonResult(BaseModel):
    query_medicines: List[str]
    pincode: str
    options: List[PharmacyOption]
    best_price_provider: Optional[str] = None
    fastest_delivery_provider: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    timestamp: str

