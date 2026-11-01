"""
CareSetu - Tata 1mg Pharmacy Adapter (Enterprise Partner Placeholder)
Official Partner Program: Requires signed B2B Enterprise Agreement.
Direct scraping or unofficial reverse-engineering of consumer APIs is strictly prohibited.

This adapter serves as an explicit placeholder documenting required enterprise access.
It remains disabled until official partner credentials (TATA_1MG_CLIENT_ID, TATA_1MG_CLIENT_SECRET,
TATA_1MG_MERCHANT_ID) and production API access are provisioned.
"""

import os
import logging
from typing import Dict, Any, List, Optional

from backend.integrations.pharmacy.base import BasePharmacyAdapter
from backend.models.pharmacy import (
    ProviderType,
    ProviderCapability,
    MedicineItemModel,
    PharmacyOption,
    ServiceabilityResult
)
from backend.models.order import MultiPharmacyOrder

logger = logging.getLogger("caresetu.pharmacy.tata1mg")

class Tata1mgAdapter(BasePharmacyAdapter):
    """
    Disabled placeholder adapter for Tata 1mg.
    Only enables actual API operations after official partner credentials and documentation are supplied.
    """
    def __init__(self):
        super().__init__(
            provider_id="tata_1mg",
            provider_name="Tata 1mg (Enterprise Partner)",
            provider_type=ProviderType.DISABLED_PARTNER,
            capabilities=[
                # Listed for schema documentation only; currently disabled
                ProviderCapability.SEARCH,
                ProviderCapability.SERVICEABILITY
            ]
        )
        self.client_id = os.environ.get("TATA_1MG_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("TATA_1MG_CLIENT_SECRET", "").strip()
        self.merchant_id = os.environ.get("TATA_1MG_MERCHANT_ID", "").strip()

    def is_configured(self) -> bool:
        """
        Always returns False until official B2B credentials are provided.
        Prevents unauthorized or unsupported API traffic.
        """
        return bool(self.client_id and self.client_secret and self.merchant_id)

    async def check_serviceability(self, pincode: str) -> ServiceabilityResult:
        return ServiceabilityResult(
            is_serviceable=False,
            pincode=pincode,
            provider_id=self.provider_id,
            delivery_fee=0.0,
            message=(
                "Direct API access to Tata 1mg is currently pending official Enterprise Partnership. "
                "Use CareSetu App Navigation mode to prepare and open a 1mg cart."
            )
        )

    async def search_medicine(self, query: str, pincode: Optional[str] = None) -> List[MedicineItemModel]:
        logger.info("Tata 1mg direct API search requested but adapter is in DISABLED_PARTNER status.")
        return []

    async def get_medicine_details(self, medicine_id: str) -> Optional[MedicineItemModel]:
        return None

    async def check_stock(self, medicine_id: str, quantity: int, pincode: Optional[str] = None) -> bool:
        return False

    async def prepare_order(
        self,
        items: List[Dict[str, Any]],
        delivery_address: str,
        pincode: str
    ) -> PharmacyOption:
        return PharmacyOption(
            provider_id=self.provider_id,
            provider_name=self.provider_name,
            provider_type=self.provider_type,
            supported_capabilities=[],
            items=[],
            subtotal=0.0,
            delivery_fee=0.0,
            total=0.0,
            estimated_delivery="Unavailable (Direct API requires Enterprise Partnership)",
            is_serviceable=False,
            serviceability_message="Direct API integration requires official Tata 1mg Enterprise B2B Partnership.",
            disclaimer="Direct API is currently disabled. Please select another provider or use App Navigation."
        )

    async def submit_order(self, order: MultiPharmacyOrder) -> Dict[str, Any]:
        return {
            "success": False,
            "error": "Tata 1mg direct API order submission is not available. Enterprise partnership agreement required.",
            "code": "PARTNERSHIP_REQUIRED"
        }

    async def get_order_status(self, provider_order_id: str) -> Dict[str, Any]:
        return {
            "success": False,
            "error": "Order tracking unavailable via disabled Tata 1mg API adapter."
        }

    async def cancel_order(self, provider_order_id: str, reason: str) -> Dict[str, Any]:
        return {
            "success": False,
            "error": "Order cancellation unavailable via disabled Tata 1mg API adapter."
        }

