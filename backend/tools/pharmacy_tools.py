"""
CareSetu Pharmacy Agent Tools
Real agentic tools for Gemini coordinator to search, compare, select,
and track multi-pharmacy options with guardian authorization.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional

from backend.integrations.pharmacy.orchestrator import PharmacyOrchestrator
from backend.services.order_service import OrderService
from backend.database.mock_db import get_db

logger = logging.getLogger("caresetu.tools.pharmacy")

orchestrator = PharmacyOrchestrator()

def _run_async(coro):
    """Safely runs async coroutine within synchronous tool invocation."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import nest_asyncio
        nest_asyncio.apply()
        return loop.run_until_complete(coro)
    return asyncio.run(coro)

def compare_pharmacies(
    medicines: Any,
    pincode: Optional[str] = "560003"
) -> Dict[str, Any]:
    """
    Compares availability, prices, and delivery speed across multiple pharmacy networks
    (eVitalRx, MedPay, Apollo, Tata 1mg).
    """
    clean_pincode = pincode or "560003"
    db = get_db()
    delivery_address = db.get("patient", {}).get("emergency_contact", {}).get("location", "Malleshwaram, Bengaluru")

    # Handle string or list inputs from Gemini
    med_list: List[Dict[str, Any]] = []
    if isinstance(medicines, str):
        # e.g. "Amlong 5mg and Glycomet 500 SR"
        med_list = [{"name": m.strip(), "quantity": 1} for m in medicines.split("and")]
    elif isinstance(medicines, list):
        for it in medicines:
            if isinstance(it, str):
                med_list.append({"name": it, "quantity": 1})
            elif isinstance(it, dict):
                med_list.append(it)
    else:
        # Fallback to previous order items
        prev = db.get("previous_orders", [{}])[0].get("items", [])
        med_list = [{"name": it.get("name"), "dosage": it.get("dosage"), "quantity": 1} for it in prev]

    comparison_result = _run_async(
        orchestrator.compare_pharmacies(
            medicines=med_list,
            pincode=clean_pincode,
            delivery_address=delivery_address
        )
    )

    options_data = [opt.model_dump() for opt in comparison_result.options]

    # Create a draft order for the best priced provider so user can authorize easily
    best_opt = comparison_result.options[0] if comparison_result.options else None
    draft_order_id = None
    if best_opt:
        order = OrderService.create_order_from_option(
            patient_id=db["patient"]["id"],
            patient_name=db["patient"]["name"],
            selected_option=best_opt,
            delivery_address=delivery_address,
            pincode=clean_pincode
        )
        draft_order_id = order.order_id

    return {
        "status": "success",
        "pincode": clean_pincode,
        "query_medicines": comparison_result.query_medicines,
        "options_count": len(options_data),
        "options": options_data,
        "best_price_provider": comparison_result.best_price_provider,
        "fastest_delivery_provider": comparison_result.fastest_delivery_provider,
        "warnings": comparison_result.warnings,
        "draft_order_id": draft_order_id,
        "message": (
            f"Compared {len(options_data)} pharmacy options for {clean_pincode}. "
            f"Best price: {comparison_result.best_price_provider or 'N/A'}. "
            f"Fastest delivery: {comparison_result.fastest_delivery_provider or 'N/A'}."
        )
    }

def select_pharmacy_option(
    provider_id: str,
    medicines: Optional[List[Dict[str, Any]]] = None,
    order_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Selects a specific pharmacy provider, prepares the order,
    and requests human/guardian authorization.
    """
    db = get_db()
    delivery_address = db.get("patient", {}).get("emergency_contact", {}).get("location", "Malleshwaram, Bengaluru")
    pincode = "560003"

    adapter = orchestrator.get_adapter(provider_id)
    if not adapter:
        return {"status": "error", "message": f"Provider '{provider_id}' is not supported."}

    # If an order already exists, verify or update provider
    if order_id:
        existing_order = OrderService.get_order(order_id)
        if existing_order:
            return {
                "status": "success",
                "order_id": existing_order.order_id,
                "provider": existing_order.selected_provider_name,
                "total": existing_order.total,
                "state": existing_order.state.value,
                "requires_approval": True,
                "message": f"Order {order_id} prepared with {existing_order.selected_provider_name}. Awaiting approval."
            }

    # Prepare order option
    med_list = medicines or [
        {"name": "Amlong 5mg Tablet", "quantity": 1, "pack_size": 15, "price_per_pack": 44.50},
        {"name": "Glycomet 500mg SR Tablet", "quantity": 1, "pack_size": 20, "price_per_pack": 41.00}
    ]

    option = _run_async(adapter.prepare_order(med_list, delivery_address, pincode))
    order = OrderService.create_order_from_option(
        patient_id=db["patient"]["id"],
        patient_name=db["patient"]["name"],
        selected_option=option,
        delivery_address=delivery_address,
        pincode=pincode
    )

    # Request guardian approval
    OrderService.request_approval(order.order_id, role="guardian", channel="whatsapp")

    return {
        "status": "success",
        "order_id": order.order_id,
        "provider": order.selected_provider_name,
        "items": [it.name for it in order.items],
        "total": order.total,
        "state": order.state.value,
        "requires_approval": True,
        "handoff_url": order.handoff_url,
        "message": (
            f"Prepared refill order {order.order_id} with {order.selected_provider_name} for ₹{order.total:.2f}. "
            f"Sent approval request to guardian Priya Rao."
        )
    }

def track_pharmacy_order(order_id: str) -> Dict[str, Any]:
    """
    Checks real-time fulfillment status of an order along the 16-stage lifecycle.
    """
    tracking = _run_async(orchestrator.get_order_tracking(order_id))
    return {
        "status": "success",
        "order_id": order_id,
        "tracking": tracking
    }

def launch_pharmacy_app_navigation(
    provider_id: str = "app_nav_tata_1mg",
    medicines: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Generates assisted navigation instructions and official link for platforms
    without open APIs (e.g. Tata 1mg, Apollo 24/7).
    """
    adapter = orchestrator.get_adapter(provider_id)
    if not adapter:
        adapter = orchestrator.get_adapter("app_nav_tata_1mg")

    db = get_db()
    med_list = medicines or [
        {"name": "Amlong 5mg Tablet", "quantity": 1},
        {"name": "Glycomet 500mg SR Tablet", "quantity": 1}
    ]

    option = _run_async(
        adapter.prepare_order(
            med_list,
            db.get("patient", {}).get("emergency_contact", {}).get("location", "Malleshwaram, Bengaluru"),
            "560003"
        )
    )

    return {
        "status": "success",
        "platform": option.provider_name,
        "handoff_url": option.handoff_url,
        "instructions": option.handoff_instructions,
        "items": [it.name for it in option.items],
        "estimated_total": option.total,
        "message": f"Prepared assisted checkout checklist for {option.provider_name}."
    }

