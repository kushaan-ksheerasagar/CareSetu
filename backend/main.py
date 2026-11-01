"""
CareSetu - FastAPI Backend Server
Voice-First Agentic AI Healthcare Coordinator for Elders in India.
Core principle: AI coordinates. Humans authorize.
"""

import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

import uuid
import datetime
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Body, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load local .env if present
load_dotenv()

from backend.database.mock_db import get_db, reset_db
from backend.agents.coordinator import run_agentic_reasoning
from backend.integrations.bolna_client import (
    create_bolna_web_call_session,
    is_bolna_configured
)
from backend.integrations.pharmacy.orchestrator import PharmacyOrchestrator
from backend.services.order_service import OrderService
from backend.services.consent_service import ConsentService
from backend.models.order import OrderLifecycleState, MultiPharmacyOrder
from backend.models.pharmacy import PharmacyOption, MedicineItemModel



app = FastAPI(
    title="CareSetu API",
    description="Voice-First Agentic AI Healthcare Coordinator for Elders",
    version="1.0.0"
)

# Robust CORS for localhost, preview deployments, and production Vercel / Render domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vercel Serverless Path-Normalization Middleware
# Restores original path when Vercel rewrites /api/* to /api?path=* or passes x-forwarded-uri
@app.middleware("http")
async def vercel_routing_middleware(request: Request, call_next):
    path_param = request.query_params.get("path")
    if path_param:
        clean = path_param.lstrip("/")
        request.scope["path"] = f"/api/{clean}"
    else:
        forwarded = request.headers.get("x-forwarded-uri", "").split("?")[0]
        if forwarded and forwarded.startswith("/api/"):
            request.scope["path"] = forwarded
    return await call_next(request)

router = APIRouter()

class ReasonRequest(BaseModel):
    message: str
    language: Optional[str] = "English"
    custom_gemini_api_key: Optional[str] = None
    patient_id: Optional[str] = "PAT-72-BLR"

class BolnaSessionRequest(BaseModel):
    user_data: Optional[Dict[str, Any]] = None

class RequestApprovalPayload(BaseModel):
    action_type: str
    title: Optional[str] = None
    details: Dict[str, Any]
    reason: str
    approval_id: Optional[str] = None
    guardian_name: Optional[str] = "Priya Rao"
    guardian_phone: Optional[str] = "+91 98450 12345"

class ApprovalActionRequest(BaseModel):
    approval_id: str
    decision: str  # "approved" or "rejected"
    authorized_by: Optional[str] = "Priya Rao (Guardian)"
    notes: Optional[str] = None

class ReminderToggleRequest(BaseModel):
    reminder_id: str
    status: str # "completed" or "pending"

class AppointmentBookRequest(BaseModel):
    slot_id: str
    patient_notes: Optional[str] = None

@router.get("/health")
def health_check():
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    bolna_key = os.environ.get("BOLNA_API_KEY", "").strip()
    bolna_agent = os.environ.get("BOLNA_AGENT_ID", "").strip()
    
    return {
        "status": "ok",
        "services": {
            "gemini_api": {
                "configured": bool(gemini_key),
                "model": "gemini-1.5-flash / gemini-2.0-flash",
                "mode": "live_gemini" if gemini_key else "deterministic_agent_engine"
            },
            "bolna_voice_ai": {
                "configured": bool(bolna_key and bolna_agent),
                "agent_id": bolna_agent if bolna_agent else None,
                "mode": "bolna_live_web_call" if (bolna_key and bolna_agent) else "transparent_demo_voice_mode"
            }
        },
        "principle": "AI coordinates. Humans authorize.",
        "timestamp": datetime.datetime.now().isoformat()
    }

@router.get("/state")
def get_application_state():
    """Returns the complete synchronized state for the CareSetu frontend dashboard."""
    return get_db()

@router.post("/state/reset")
def reset_application_state():
    """Resets the mock database to default state for a fresh demonstration."""
    fresh_db = reset_db()
    return {
        "status": "success",
        "message": "CareSetu state reset to fresh demo default.",
        "state": fresh_db
    }

@router.post("/bolna-session")
async def bolna_session_endpoint(payload: BolnaSessionRequest = Body(default=BolnaSessionRequest())):
    """
    Creates a Bolna Web Call session or returns transparent demo mode info.
    Protects API credentials server-side as required by Bolna documentation.
    """
    session_result = await create_bolna_web_call_session(payload.user_data)
    return session_result

@router.post("/agent/reason")
async def agent_reason_endpoint(payload: ReasonRequest):
    """
    Core Agentic Reasoning endpoint.
    Executes the 8-stage agent loop, dispatches tools, and verifies human authorization.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="User message cannot be empty")
        
    reasoning_result = await run_agentic_reasoning(
        user_message=payload.message,
        language=payload.language or "English",
        custom_gemini_api_key=payload.custom_gemini_api_key
    )
    return reasoning_result

@router.post("/guardian/request-approval")
def request_approval_endpoint(payload: RequestApprovalPayload):
    """
    Registers a new pending authorization request for the guardian.
    Keeps frontend and backend state synchronized.
    """
    db = get_db()
    guardian = db.get("guardian", {})
    pending_approvals = guardian.setdefault("pending_approvals", [])
    
    appr_id = payload.approval_id or f"APPR-{uuid.uuid4().hex[:6].upper()}"
    timestamp = datetime.datetime.now().strftime("%I:%M %p Today")
    
    approval_entry = {
        "id": appr_id,
        "action_type": payload.action_type,
        "title": payload.title or f"Approval Request: {payload.action_type.replace('_', ' ').title()}",
        "details": payload.details,
        "reason": payload.reason,
        "guardian_name": payload.guardian_name or guardian.get("name", "Priya Rao"),
        "guardian_phone": payload.guardian_phone or guardian.get("phone", "+91 98450 12345"),
        "status": "pending",
        "created_at": timestamp
    }
    
    pending_approvals.insert(0, approval_entry)
    
    guardian.setdefault("notifications", []).insert(0, {
        "id": f"NOTIF-{uuid.uuid4().hex[:6]}",
        "timestamp": timestamp,
        "title": f"Action Needs Authorization: {payload.action_type.replace('_', ' ').title()}",
        "message": f"Ramachandra ji requested {payload.reason}. Please review and approve.",
        "priority": "high",
        "read": False
    })
    
    db.setdefault("activity_log", []).insert(0, {
        "id": f"ACT-{uuid.uuid4().hex[:6]}",
        "time": "Just now",
        "title": "Guardian Approval Requested",
        "description": f"Refill authorization request sent to {approval_entry['guardian_name']}.",
        "type": "approval"
    })
    
    return {
        "status": "success",
        "approval_id": appr_id,
        "approval_entry": approval_entry,
        "pending_approvals": pending_approvals,
        "notifications": guardian.get("notifications", [])
    }

@router.post("/guardian/approve")
def guardian_approve_endpoint(payload: ApprovalActionRequest):
    """
    Handles guardian authorization decisions.
    Enforces the principle: AI coordinates. Humans authorize.
    Resilient to serverless cold-starts.
    """
    db = get_db()
    guardian = db.get("guardian", {})
    pending = guardian.get("pending_approvals", [])
    
    target_idx = None
    for idx, item in enumerate(pending):
        if item.get("id") == payload.approval_id:
            target_idx = idx
            break
            
    if target_idx is not None:
        approval = pending.pop(target_idx)
    else:
        # Serverless cold-start resilience: synthesize entry from request if container recycled
        approval = {
            "id": payload.approval_id,
            "action_type": "medicine_order_refill",
            "title": "Monthly Medicine Refill (Amlong 5 + Glycomet 500 SR)",
            "details": db.get("cart", {}),
            "reason": "Elder requested monthly medicine refill",
            "guardian_name": payload.authorized_by or "Priya Rao",
            "status": "pending",
            "created_at": "Earlier"
        }
        
    approval["status"] = payload.decision
    approval["decided_at"] = datetime.datetime.now().strftime("%I:%M %p Today")
    approval["decided_by"] = payload.authorized_by
    approval["notes"] = payload.notes
    
    if approval.get("action_type") == "medicine_order_refill":
        cart = db.get("cart", {})
        if payload.decision == "approved":
            cart["status"] = "authorized_order_placed"
            cart["authorized_by"] = payload.authorized_by
            db.setdefault("activity_log", []).insert(0, {
                "id": f"ACT-{uuid.uuid4().hex[:6]}",
                "time": "Just now",
                "title": "Medicine Refill Order Authorized",
                "description": f"{payload.authorized_by} approved monthly refill. Dispatch scheduled via Apollo Pharmacy.",
                "type": "order"
            })
        else:
            cart["status"] = "authorization_rejected"
            cart["authorized_by"] = f"{payload.authorized_by} (Declined)"
            db.setdefault("activity_log", []).insert(0, {
                "id": f"ACT-{uuid.uuid4().hex[:6]}",
                "time": "Just now",
                "title": "Refill Request Declined",
                "description": f"{payload.authorized_by} declined the monthly refill request.",
                "type": "order"
            })
    elif approval.get("action_type") == "doctor_appointment_booking" and payload.decision == "approved":
        db.setdefault("appointments", []).insert(0, {
            "id": f"APT-{uuid.uuid4().hex[:6].upper()}",
            "doctor_name": "Dr. Ananya Sharma",
            "speciality": "Cardiologist",
            "clinic": "Manipal Heart Centre, Old Airport Road",
            "date": "Tomorrow",
            "time": "11:30 AM",
            "type": "Cardiology Consultation",
            "status": "confirmed",
            "guardian_notified": True
        })
        db.setdefault("activity_log", []).insert(0, {
            "id": f"ACT-{uuid.uuid4().hex[:6]}",
            "time": "Just now",
            "title": "Appointment Confirmed",
            "description": "Consultation with Dr. Ananya Sharma confirmed for Tomorrow at 11:30 AM.",
            "type": "appointment"
        })
        
    return {
        "status": "success",
        "decision": payload.decision,
        "approval": approval,
        "updated_state": {
            "cart": db.get("cart"),
            "appointments": db.get("appointments"),
            "pending_approvals": guardian.get("pending_approvals", []),
            "activity_log": db.get("activity_log", [])
        }
    }

@router.post("/reminders/toggle")
def toggle_reminder_endpoint(payload: ReminderToggleRequest):
    """Marks a medicine reminder as completed or pending."""
    db = get_db()
    reminders = db.get("reminders", [])
    
    found = False
    for r in reminders:
        if r.get("id") == payload.reminder_id:
            r["status"] = payload.status
            if payload.status == "completed":
                r["completed_at"] = datetime.datetime.now().strftime("%I:%M %p Today")
                db.setdefault("activity_log", []).insert(0, {
                    "id": f"ACT-{uuid.uuid4().hex[:6]}",
                    "time": "Just now",
                    "title": "Dose Completed",
                    "description": f"Ramachandra ji confirmed taking {r.get('medicine_name')}.",
                    "type": "medicine"
                })
            else:
                r["completed_at"] = None
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    return {"status": "success", "reminders": reminders}

@router.post("/appointments/book")
def book_appointment_endpoint(payload: AppointmentBookRequest):
    """Directly confirms an appointment slot after elder/guardian authorization."""
    db = get_db()
    slots = db.get("available_doctor_slots", [])
    
    slot = next((s for s in slots if s.get("slot_id") == payload.slot_id), None)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
        
    new_apt = {
        "id": f"APT-{uuid.uuid4().hex[:6].upper()}",
        "doctor_name": slot["doctor_name"],
        "speciality": slot["speciality"],
        "clinic": slot["hospital"],
        "date": slot["date"],
        "time": slot["time"],
        "type": "In-Person Consultation",
        "status": "confirmed",
        "guardian_notified": True
    }
    db.setdefault("appointments", []).insert(0, new_apt)
    
    send_guardian_notification(
        f"Appointment booked for Ramachandra ji with {slot['doctor_name']} ({slot['speciality']}) on {slot['date']} at {slot['time']}."
    )
    
    return {"status": "success", "appointment": new_apt, "appointments": db["appointments"]}


# -------------------------------------------------------------
# MULTI-PHARMACY API ROUTES
# -------------------------------------------------------------
pharmacy_orchestrator = PharmacyOrchestrator()

class PharmacyComparePayload(BaseModel):
    medicines: Optional[list] = None
    pincode: Optional[str] = "560003"
    delivery_address: Optional[str] = "42/1, 8th Cross, Malleshwaram, Bengaluru"

class PharmacyOrderCreatePayload(BaseModel):
    provider_id: str
    medicines: Optional[list] = None
    pincode: Optional[str] = "560003"
    delivery_address: Optional[str] = "42/1, 8th Cross, Malleshwaram, Bengaluru"
    idempotency_key: Optional[str] = None

class PharmacyOrderApprovePayload(BaseModel):
    decision: str = "approved"  # "approved" or "rejected"
    authorized_by: Optional[str] = "Sri Ramachandra Rao"
    role: Optional[str] = "patient"  # "patient" or "guardian"
    notes: Optional[str] = None

@router.get("/pharmacy/providers")
def get_pharmacy_providers():
    """Lists registered pharmacy providers and their configuration status."""
    return {
        "status": "success",
        "providers": pharmacy_orchestrator.list_providers()
    }

@router.post("/pharmacy/serviceability")
async def check_pharmacy_serviceability(payload: Dict[str, Any] = Body(...)):
    """Checks delivery serviceability across all active providers for a pincode."""
    pincode = str(payload.get("pincode", "560003")).strip()
    results = await pharmacy_orchestrator.check_serviceability_all(pincode)
    return {
        "status": "success",
        "pincode": pincode,
        "results": [r.model_dump() for r in results]
    }

@router.post("/pharmacy/compare")
async def compare_pharmacies_endpoint(payload: PharmacyComparePayload):
    """
    Compares availability, pack size, price, and delivery across providers.
    """
    db = get_db()
    meds = payload.medicines
    if not meds:
        # Default to previous medication orders for convenience
        prev_orders = db.get("previous_orders", [])
        if prev_orders and prev_orders[0].get("items"):
            meds = [{"name": it["name"], "quantity": 1} for it in prev_orders[0]["items"]]
        else:
            meds = [
                {"name": "Amlong 5mg Tablet", "quantity": 1},
                {"name": "Glycomet 500mg SR Tablet", "quantity": 1}
            ]

    comparison = await pharmacy_orchestrator.compare_pharmacies(
        medicines=meds,
        pincode=payload.pincode or "560003",
        delivery_address=payload.delivery_address or "Malleshwaram, Bengaluru"
    )

    return {
        "status": "success",
        "comparison": comparison.model_dump()
    }

@router.post("/pharmacy/orders/create")
async def create_pharmacy_order_endpoint(payload: PharmacyOrderCreatePayload):
    """
    Creates an order in ORDER_PREPARED state with the chosen provider.
    """
    db = get_db()
    adapter = pharmacy_orchestrator.get_adapter(payload.provider_id)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Provider '{payload.provider_id}' not found.")

    meds = payload.medicines or [
        {"name": "Amlong 5mg Tablet", "quantity": 1, "pack_size": 15, "price_per_pack": 44.50},
        {"name": "Glycomet 500mg SR Tablet", "quantity": 1, "pack_size": 20, "price_per_pack": 41.00}
    ]

    option = await adapter.prepare_order(
        items=meds,
        delivery_address=payload.delivery_address or "Malleshwaram, Bengaluru",
        pincode=payload.pincode or "560003"
    )

    order = OrderService.create_order_from_option(
        patient_id=db["patient"]["id"],
        patient_name=db["patient"]["name"],
        selected_option=option,
        delivery_address=payload.delivery_address or "Malleshwaram, Bengaluru",
        pincode=payload.pincode or "560003",
        idempotency_key=payload.idempotency_key
    )

    # Automatically notify/queue guardian approval
    OrderService.request_approval(order.order_id, role="guardian", channel="whatsapp")

    return {
        "status": "success",
        "order": order.model_dump(),
        "requires_authorization": True
    }

@router.post("/pharmacy/orders/{order_id}/approve")
async def approve_pharmacy_order_endpoint(order_id: str, payload: PharmacyOrderApprovePayload):
    """
    Records human authorization (patient or guardian) with immutable item signature.
    """
    try:
        order, is_approved, message = OrderService.record_authorization(
            order_id=order_id,
            authorized_by=payload.authorized_by or "Sri Ramachandra Rao",
            role=payload.role or "patient",
            decision=payload.decision,
            notes=payload.notes
        )
        return {
            "status": "success",
            "decision": payload.decision,
            "order": order.model_dump(),
            "message": message
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/pharmacy/orders/{order_id}/submit")
async def submit_pharmacy_order_endpoint(order_id: str):
    """
    Submits an approved order to the provider adapter or initiates app-navigation.
    """
    result = await pharmacy_orchestrator.submit_authorized_order(order_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Order submission failed"))
    return result

@router.get("/pharmacy/orders/{order_id}/status")
async def get_pharmacy_order_status(order_id: str):
    """
    Retrieves full 16-stage order lifecycle state, audit trail, and provider tracking.
    """
    order = OrderService.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    tracking = await pharmacy_orchestrator.get_order_tracking(order_id)
    return {
        "status": "success",
        "order": order.model_dump(),
        "tracking": tracking
    }

@router.post("/pharmacy/webhooks/{provider_id}")
async def pharmacy_webhook_endpoint(provider_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Receives external webhook notifications from pharmacy providers
    (e.g. MedPay or eVitalRx order confirmations, dispatches, deliveries).
    """
    order_id = payload.get("care_setu_order_id") or payload.get("order_id")
    event_status = payload.get("status")

    if not order_id:
        return {"status": "ignored", "reason": "No order_id in webhook payload"}

    target_state = OrderLifecycleState.CONFIRMED
    if event_status in ("dispatched", "out_for_delivery"):
        target_state = OrderLifecycleState.DISPATCHED
    elif event_status in ("delivered", "completed"):
        target_state = OrderLifecycleState.DELIVERED
    elif event_status in ("cancelled", "rejected"):
        target_state = OrderLifecycleState.CANCELLED

    try:
        updated = OrderService.update_fulfillment_status(
            order_id=order_id,
            new_state=target_state,
            provider_order_id=payload.get("provider_order_id"),
            notes=payload.get("message", f"Webhook update from {provider_id}"),
            actor=f"{provider_id.capitalize()} Webhook"
        )
        return {"status": "success", "order_state": updated.state.value}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# Mount router under BOTH /api and root ("")
# This guarantees 100% path compatibility whether called as /api/health or /health in Vercel
app.include_router(router, prefix="/api")
app.include_router(router, prefix="")

@app.get("/")
@app.get("/api")
@app.get("/api/")
def root():
    return {
        "service": "CareSetu Voice-First Agentic AI Coordinator",
        "tagline": "AI coordinates. Humans authorize.",
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
