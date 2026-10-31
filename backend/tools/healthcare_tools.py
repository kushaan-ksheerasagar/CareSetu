"""
CareSetu Healthcare Agent Tools
Real functional tools executed by the Agentic AI reasoning coordinator.
Follows the core principle: AI coordinates. Humans authorize.
"""

from typing import Dict, Any, List, Optional
import datetime
import uuid
from backend.database.mock_db import get_db

def get_previous_medicine_orders(patient_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves the user's previously approved medicine orders from their medical history.
    Used when the user requests 'the same medicine I ordered last month'.
    """
    db = get_db()
    orders = db.get("previous_orders", [])
    if not orders:
        return {
            "status": "not_found",
            "message": "No previous medication orders found in your medical history.",
            "orders": []
        }
    
    last_order = orders[0]
    return {
        "status": "success",
        "order_id": last_order["order_id"],
        "date_display": last_order["date_display"],
        "pharmacy": last_order["pharmacy"],
        "items": last_order["items"],
        "total_amount": last_order["total_amount"],
        "delivery_address": last_order["delivery_address"],
        "summary": f"Retrieved order {last_order['order_id']} from {last_order['date_display']}: {', '.join([item['name'] + ' (' + item['dosage'] + ')' for item in last_order['items']])}."
    }

def search_medicine(query: str, category: Optional[str] = None) -> Dict[str, Any]:
    """
    Searches the verified pharmacy catalogue for matching medicines, strengths, forms, and stock.
    """
    db = get_db()
    catalogue = db.get("pharmacy_catalogue", [])
    query_lower = query.lower().strip()
    
    matches = []
    for med in catalogue:
        if (query_lower in med["name"].lower() or 
            query_lower in med["generic_name"].lower() or 
            query_lower in med["category"].lower() or
            query_lower in med["common_usage"].lower()):
            matches.append(med)
            
    return {
        "status": "success",
        "query": query,
        "count": len(matches),
        "results": matches
    }

def prepare_medicine_cart(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Prepares a verified medicine refill cart.
    Calculates subtotal, applies delivery fee, and requires human/guardian authorization.
    """
    db = get_db()
    catalogue = {med["id"]: med for med in db.get("pharmacy_catalogue", [])}
    
    cart_items = []
    subtotal = 0.0
    
    for item in items:
        med_id = item.get("medicine_id") or item.get("id")
        med = catalogue.get(med_id)
        
        name = item.get("name") or (med["name"] if med else "Medicine")
        dosage = item.get("dosage") or (med["dosage"] if med else "")
        price = float(item.get("price") or (med["price"] if med else 0.0))
        quantity = int(item.get("quantity") or 1)
        item_total = price * quantity
        subtotal += item_total
        
        cart_items.append({
            "medicine_id": med_id,
            "name": name,
            "dosage": dosage,
            "quantity": quantity,
            "price_per_pack": price,
            "item_total": item_total,
            "prescription_required": med.get("prescription_required", True) if med else True
        })
    
    delivery_fee = 0.0 if subtotal >= 100.0 else 30.0
    total = subtotal + delivery_fee
    
    updated_cart = {
        "items": cart_items,
        "subtotal": subtotal,
        "delivery_fee": delivery_fee,
        "total": total,
        "status": "prepared_pending_authorization",
        "delivery_address": db["patient"]["emergency_contact"]["location"],
        "requires_guardian_authorization": True
    }
    
    db["cart"] = updated_cart
    
    return {
        "status": "success",
        "cart": updated_cart,
        "requires_human_approval": True,
        "message": f"Prepared cart with {len(cart_items)} item(s) for a total of ₹{total:.2f}. Sensitive action: requires human or guardian approval."
    }

def create_medicine_reminder(medicine_name: str, time_slot: str, dosage: str = "1 tablet", timing_label: Optional[str] = None) -> Dict[str, Any]:
    """
    Creates a new daily medicine reminder for the elder patient.
    """
    db = get_db()
    reminders = db.get("reminders", [])
    
    new_reminder = {
        "id": f"REM-{len(reminders) + 1}",
        "medicine_name": medicine_name,
        "dosage": dosage,
        "time_slot": time_slot,
        "timing_label": timing_label or "As scheduled",
        "frequency": "Daily",
        "status": "pending",
        "completed_at": None
    }
    
    reminders.append(new_reminder)
    
    # Add activity log
    db["activity_log"].insert(0, {
        "id": f"ACT-{uuid.uuid4().hex[:6]}",
        "time": "Just now",
        "title": "Reminder Created",
        "description": f"Added reminder for {medicine_name} at {time_slot} ({timing_label or 'Daily'}).",
        "type": "reminder"
    })
    
    return {
        "status": "success",
        "reminder": new_reminder,
        "message": f"Successfully set daily reminder for {medicine_name} at {time_slot} ({timing_label or 'Daily'})."
    }

def find_doctor_appointments(speciality: Optional[str] = None, preferred_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Finds available doctor consultation slots from verified healthcare providers.
    """
    db = get_db()
    slots = db.get("available_doctor_slots", [])
    
    filtered = slots
    if speciality:
        spec_lower = speciality.lower()
        filtered = [s for s in slots if spec_lower in s["speciality"].lower() or spec_lower in s["doctor_name"].lower()]
        
    return {
        "status": "success",
        "count": len(filtered),
        "available_slots": filtered,
        "message": f"Found {len(filtered)} available consultation slot(s)."
    }

def request_guardian_approval(action_type: str, details: Dict[str, Any], reason: str) -> Dict[str, Any]:
    """
    Sends an authorization request to the registered guardian (Priya Rao).
    Core principle: AI coordinates. Humans authorize.
    """
    db = get_db()
    guardian = db.get("guardian", {})
    pending_approvals = guardian.setdefault("pending_approvals", [])
    
    approval_id = f"APPR-{uuid.uuid4().hex[:6].upper()}"
    timestamp = datetime.datetime.now().strftime("%I:%M %p Today")
    
    approval_entry = {
        "id": approval_id,
        "action_type": action_type, # e.g. "medicine_order_refill", "doctor_appointment_booking"
        "title": details.get("title", f"Approval Request: {action_type.replace('_', ' ').title()}"),
        "details": details,
        "reason": reason,
        "guardian_name": guardian.get("name", "Priya Rao"),
        "guardian_phone": guardian.get("phone", "+91 98450 12345"),
        "status": "pending",
        "created_at": timestamp
    }
    
    pending_approvals.insert(0, approval_entry)
    
    # Also log notification
    guardian.setdefault("notifications", []).insert(0, {
        "id": f"NOTIF-{uuid.uuid4().hex[:6]}",
        "timestamp": timestamp,
        "title": f"Action Needs Authorization: {action_type.replace('_', ' ').title()}",
        "message": f"Ramachandra ji requested {reason}. Please review and approve.",
        "priority": "high",
        "read": False
    })
    
    # Log to main activity log
    db.setdefault("activity_log", []).insert(0, {
        "id": f"ACT-{uuid.uuid4().hex[:6]}",
        "time": "Just now",
        "title": "Guardian Approval Requested",
        "description": f"Authorization request sent to {guardian.get('name')} for {action_type.replace('_', ' ')}.",
        "type": "approval"
    })
    
    return {
        "status": "success",
        "approval_id": approval_id,
        "guardian": guardian.get("name"),
        "phone": guardian.get("phone"),
        "approval_entry": approval_entry,
        "message": f"Authorization request sent to {guardian.get('name')} ({guardian.get('phone')}). Status: Pending Approval."
    }

def send_guardian_notification(message: str, priority: str = "normal") -> Dict[str, Any]:
    """
    Sends an informational notification to the guardian via simulated SMS/WhatsApp.
    """
    db = get_db()
    guardian = db.get("guardian", {})
    timestamp = datetime.datetime.now().strftime("%I:%M %p Today")
    
    notif_entry = {
        "id": f"NOTIF-{uuid.uuid4().hex[:6]}",
        "timestamp": timestamp,
        "title": "CareSetu Update",
        "message": message,
        "priority": priority,
        "read": False
    }
    
    guardian.setdefault("notifications", []).insert(0, notif_entry)
    
    db.setdefault("activity_log", []).insert(0, {
        "id": f"ACT-{uuid.uuid4().hex[:6]}",
        "time": "Just now",
        "title": "Guardian Notified",
        "description": message,
        "type": "notification"
    })
    
    return {
        "status": "success",
        "notification": notif_entry,
        "delivered_to": f"{guardian.get('name')} ({guardian.get('phone')})",
        "channel": "WhatsApp & SMS",
        "message": f"Notification successfully sent to {guardian.get('name')} via WhatsApp & SMS."
    }

# Mapping of tool names to functions
HEALTHCARE_TOOLS_REGISTRY = {
    "get_previous_medicine_orders": get_previous_medicine_orders,
    "search_medicine": search_medicine,
    "prepare_medicine_cart": prepare_medicine_cart,
    "create_medicine_reminder": create_medicine_reminder,
    "find_doctor_appointments": find_doctor_appointments,
    "request_guardian_approval": request_guardian_approval,
    "send_guardian_notification": send_guardian_notification,
}
