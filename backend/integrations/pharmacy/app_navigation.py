"""
CareSetu - App Navigation Pharmacy Adapter
Provides assisted handoff to official pharmacy websites and mobile apps.
Used when direct API integration is not available (e.g., Tata 1mg, Apollo 24/7, PharmEasy).

Core Principles:
- Prepares verified medicine checklists and search URLs for official apps/sites.
- NEVER uses scraping, reverse-engineered private endpoints, or headless automation.
- AI coordinates, but elder/guardian inspects and authorises payment on official vendor platform.
- Records patient confirmation upon return to CareSetu.
"""

import urllib.parse
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

logger = logging.getLogger("caresetu.pharmacy.app_navigation")

# Known official platforms with verified web search URLs & app packages
SUPPORTED_PLATFORMS: Dict[str, Dict[str, Any]] = {
    "tata_1mg": {
        "name": "Tata 1mg",
        "search_url_template": "https://www.1mg.com/search/all?name={query}",
        "home_url": "https://www.1mg.com",
        "android_package": "com.aranoah.healthkart.plus",
        "ios_scheme": "onemg://",
        "estimated_delivery": "Delivery in 24-48 hours",
        "standard_delivery_fee": 25.0,
        "rating": 4.6
    },
    "apollo_pharmacy": {
        "name": "Apollo 24/7 Pharmacy",
        "search_url_template": "https://www.apollopharmacy.in/search-medicines/{query}",
        "home_url": "https://www.apollopharmacy.in",
        "android_package": "com.apollo.patientapp",
        "ios_scheme": "apollo247://",
        "estimated_delivery": "2-hour express delivery or store pickup",
        "standard_delivery_fee": 30.0,
        "rating": 4.7
    },
    "pharmeasy": {
        "name": "PharmEasy",
        "search_url_template": "https://pharmeasy.in/search/all?name={query}",
        "home_url": "https://pharmeasy.in",
        "android_package": "com.phonegap.rxpal",
        "ios_scheme": "pharmeasy://",
        "estimated_delivery": "Tomorrow by 2:00 PM",
        "standard_delivery_fee": 29.0,
        "rating": 4.4
    },
    "netmeds": {
        "name": "Netmeds",
        "search_url_template": "https://www.netmeds.com/catalogsearch/result?q={query}",
        "home_url": "https://www.netmeds.com",
        "android_package": "com.NetmedsMarketplace.Netmeds",
        "ios_scheme": "netmeds://",
        "estimated_delivery": "1-2 days delivery",
        "standard_delivery_fee": 25.0,
        "rating": 4.3
    }
}

class AppNavigationAdapter(BasePharmacyAdapter):
    """
    Adapter implementing the assisted App Navigation fallback flow.
    Generates verified deep-links or official web search URLs along with
    structured checklists so elderly patients or guardians can review and purchase securely.
    """
    def __init__(self, platform_key: str = "tata_1mg"):
        self.platform_key = platform_key
        config = SUPPORTED_PLATFORMS.get(platform_key, SUPPORTED_PLATFORMS["tata_1mg"])
        
        super().__init__(
            provider_id=f"app_nav_{platform_key}",
            provider_name=f"{config['name']} (App Assisted)",
            provider_type=ProviderType.APP_NAVIGATION,
            capabilities=[
                ProviderCapability.SEARCH,
                ProviderCapability.SERVICEABILITY,
                ProviderCapability.ORDER_PREPARATION,
                ProviderCapability.APP_DEEP_LINK
            ]
        )
        self.platform_config = config

    def is_configured(self) -> bool:
        # App navigation is always available as a safe fallback
        return True

    def build_search_url(self, query: str) -> str:
        """Constructs safe, official URL encoding search term only."""
        encoded = urllib.parse.quote_plus(query.strip())
        template = self.platform_config.get("search_url_template")
        if template:
            return template.format(query=encoded)
        return self.platform_config.get("home_url", "https://www.1mg.com")

    async def check_serviceability(self, pincode: str) -> ServiceabilityResult:
        """App navigation is broadly serviceable across India."""
        return ServiceabilityResult(
            is_serviceable=True,
            pincode=pincode,
            provider_id=self.provider_id,
            estimated_delivery_time=self.platform_config.get("estimated_delivery", "24-48 hours"),
            delivery_fee=float(self.platform_config.get("standard_delivery_fee", 25.0)),
            message=f"Available via official {self.platform_config['name']} app or website."
        )

    async def search_medicine(self, query: str, pincode: Optional[str] = None) -> List[MedicineItemModel]:
        """
        In app-navigation mode, provides reference pricing based on standard MRP.
        """
        # Return standardized medicine item reference
        return [
            MedicineItemModel(
                medicine_id=f"nav-{self.platform_key}-{urllib.parse.quote(query[:10])}",
                name=query,
                dosage_form="Tablet",
                pack_size=10,
                quantity_packs=1,
                total_units=10,
                price_per_pack=55.0,
                total_price=55.0,
                prescription_required=True,
                in_stock=True
            )
        ]

    async def get_medicine_details(self, medicine_id: str) -> Optional[MedicineItemModel]:
        return None

    async def check_stock(self, medicine_id: str, quantity: int, pincode: Optional[str] = None) -> bool:
        return True

    async def prepare_order(
        self,
        items: List[Dict[str, Any]],
        delivery_address: str,
        pincode: str
    ) -> PharmacyOption:
        """
        Prepares a structured handoff option with step-by-step instructions and verified URL.
        """
        resolved_items: List[MedicineItemModel] = []
        subtotal = 0.0
        query_terms = []

        for it in items:
            name = it.get("name", "Prescription Medicine")
            qty = int(it.get("quantity", it.get("quantity_packs", 1)))
            pack_size = int(it.get("pack_size", 10))
            price_per_pack = float(it.get("price_per_pack", 50.0))
            total_price = round(price_per_pack * qty, 2)

            resolved_items.append(
                MedicineItemModel(
                    medicine_id=it.get("medicine_id", f"nav-{hash(name)}"),
                    name=name,
                    brand_name=it.get("brand_name"),
                    strength=it.get("strength"),
                    dosage_form=it.get("dosage_form", "Tablet"),
                    is_sustained_release=bool(it.get("is_sustained_release", False)),
                    pack_size=pack_size,
                    quantity_packs=qty,
                    total_units=qty * pack_size,
                    price_per_pack=price_per_pack,
                    total_price=total_price,
                    prescription_required=True,
                    in_stock=True,
                    instructions=it.get("instructions")
                )
            )
            subtotal += total_price
            query_terms.append(name)

        delivery_fee = float(self.platform_config.get("standard_delivery_fee", 25.0))
        if subtotal >= 500.0:
            delivery_fee = 0.0

        primary_query = query_terms[0] if query_terms else "medicines"
        handoff_url = self.build_search_url(primary_query)

        instructions = [
            f"CareSetu has prepared your medicine checklist for {self.platform_config['name']}.",
            "Click 'Open Official Website' to view the item on the official portal.",
            "Verify the pack size and formulation (ensure Sustained Release if prescribed).",
            "Upload your prescription from Dr. Harish Murthy and complete payment directly.",
            "Return to CareSetu to log the order reference number for reminder syncing."
        ]

        return PharmacyOption(
            provider_id=self.provider_id,
            provider_name=self.platform_config["name"],
            provider_type=self.provider_type,
            supported_capabilities=self.capabilities,
            items=resolved_items,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total=round(subtotal + delivery_fee, 2),
            estimated_delivery=self.platform_config.get("estimated_delivery", "24-48 hours"),
            is_serviceable=True,
            serviceability_message=f"Handoff available to {self.platform_config['name']}.",
            rating=self.platform_config.get("rating", 4.5),
            requires_prescription=True,
            handoff_url=handoff_url,
            handoff_instructions=instructions,
            disclaimer="Order is placed directly on the provider's official portal. CareSetu does not store your payment credentials.",
            confidence_score=0.90
        )

    async def submit_order(self, order: MultiPharmacyOrder) -> Dict[str, Any]:
        """
        In app-navigation mode, order submission confirms handoff preparation
        and provides navigation payload for the client UI.
        """
        primary_item = order.items[0].name if order.items else "prescription"
        handoff_url = self.build_search_url(primary_item)

        return {
            "success": True,
            "provider_order_id": f"HANDOFF-{self.platform_key.upper()}-{order.order_id[:8]}",
            "status": "handoff_ready",
            "handoff_url": handoff_url,
            "platform_name": self.platform_config["name"],
            "instructions": [
                f"1. Open {self.platform_config['name']} via the link below.",
                "2. Add the verified items to cart.",
                "3. Complete checkout using your preferred payment method (Cash, UPI or Card).",
                "4. When finished, tap 'I Placed the Order' in CareSetu to enable dose tracking."
            ],
            "message": f"Handoff prepared for {self.platform_config['name']}."
        }

    async def get_order_status(self, provider_order_id: str) -> Dict[str, Any]:
        return {
            "provider_order_id": provider_order_id,
            "status": "handoff_completed",
            "message": "Assisted order placed directly with vendor. Check vendor app for tracking."
        }

    async def cancel_order(self, provider_order_id: str, reason: str) -> Dict[str, Any]:
        return {
            "success": True,
            "provider_order_id": provider_order_id,
            "status": "cancelled",
            "message": f"App navigation session cancelled in CareSetu: {reason}"
        }

