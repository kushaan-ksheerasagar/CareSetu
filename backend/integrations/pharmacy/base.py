"""
CareSetu Pharmacy Base Adapter
Standardized interface for all pharmacy service integrations and fallbacks.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from backend.models.pharmacy import (
    IntegrationStatus,
    ProviderType,
    ProviderCapability,
    MedicineItemModel,
    PharmacyOption,
    ServiceabilityResult
)
from backend.models.order import MultiPharmacyOrder

class BasePharmacyAdapter(ABC):
    def __init__(
        self,
        provider_id: str,
        provider_name: str,
        provider_type: ProviderType,
        capabilities: List[ProviderCapability]
    ):
        self.provider_id = provider_id
        self.provider_name = provider_name
        self.provider_type = provider_type
        self.capabilities = capabilities

    def supports(self, capability: ProviderCapability) -> bool:
        return capability in self.capabilities

    def get_integration_status(self) -> IntegrationStatus:
        if not self.is_configured():
            return IntegrationStatus.DISCONNECTED
        return IntegrationStatus.MOCK_DEMO

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if provider has required API keys/credentials configured."""
        pass

    @abstractmethod
    async def check_serviceability(self, pincode: str) -> ServiceabilityResult:
        """Checks if provider delivers to the patient's pincode."""
        pass

    @abstractmethod
    async def search_medicine(self, query: str, pincode: Optional[str] = None) -> List[MedicineItemModel]:
        """Searches provider inventory for medicines matching the query."""
        pass

    @abstractmethod
    async def get_medicine_details(self, medicine_id: str) -> Optional[MedicineItemModel]:
        """Retrieves exact medicine metadata, dosage, manufacturer and pack size."""
        pass

    @abstractmethod
    async def check_stock(self, medicine_id: str, quantity: int, pincode: Optional[str] = None) -> bool:
        """Verifies if sufficient inventory is in stock."""
        pass

    @abstractmethod
    async def prepare_order(
        self,
        items: List[Dict[str, Any]],
        delivery_address: str,
        pincode: str
    ) -> PharmacyOption:
        """Calculates item pricing, delivery fees, and estimated fulfillment time."""
        pass

    @abstractmethod
    async def submit_order(self, order: MultiPharmacyOrder) -> Dict[str, Any]:
        """Submits an approved and authorized order to the pharmacy provider."""
        pass

    @abstractmethod
    async def get_order_status(self, provider_order_id: str) -> Dict[str, Any]:
        """Retrieves current fulfillment state from the provider."""
        pass

    @abstractmethod
    async def cancel_order(self, provider_order_id: str, reason: str) -> Dict[str, Any]:
        """Requests cancellation of an unfulfilled order."""
        pass

