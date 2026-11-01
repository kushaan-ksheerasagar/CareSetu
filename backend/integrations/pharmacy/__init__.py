"""
CareSetu Multi-Pharmacy Integrations Package
Exports base interface, direct adapters, disabled partner placeholder, and app navigation.
"""

from backend.integrations.pharmacy.base import BasePharmacyAdapter
from backend.integrations.pharmacy.evitalrx import EVitalRxAdapter
from backend.integrations.pharmacy.medpay import MedPayAdapter
from backend.integrations.pharmacy.tata_1mg import Tata1mgAdapter
from backend.integrations.pharmacy.app_navigation import AppNavigationAdapter

__all__ = [
    "BasePharmacyAdapter",
    "EVitalRxAdapter",
    "MedPayAdapter",
    "Tata1mgAdapter",
    "AppNavigationAdapter"
]

