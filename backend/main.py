"""
CareSetu - FastAPI Backend Server
Voice-First Agentic AI Healthcare Coordinator for Elders in India.
Core principle: AI coordinates. Humans authorize.
"""

import os
import uuid
import datetime
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Body
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
from backend.tools.healthcare_tools import (
    request_guardian_approval,
    send_guardian_notification
)

app = FastAPI(
    title="CareSetu API",
    description="Voice-First Agentic AI Healthcare Coordinator for Elders",
    version="1.0.0"
)

# Enable CORS for frontend Vite dev server (port 3000/5173) and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ReasonRequest(BaseModel):
    message: str
    language: Optional[str] = "English"
    custom_gemini_api_key: Optional[str] = None
    patient_id: Optional[str] = "PAT-72-BLR"

class BolnaSessionRequest(BaseModel):
    user_data: Optional[Dict[str, Any]] = None

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

@app.get("/")
def root():
    return {
        "service": "CareSetu Voice-First Agentic AI Coordinator",
        "tagline": "AI coordinates. Humans authorize.",
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.get("/api/health")
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

@app.get("/api/state")
def get_application_state():
    """Returns the complete synchronized state for the CareSetu frontend dashboard."""
    return get_db()

@app.post("/api/state/reset")
def reset_application_state():
    """Resets the mock database to default state for a fresh demonstration."""
    fresh_db = reset_db()
    return {
        "status": "success",
        "message": "CareSetu state reset to fresh demo default.",
        "state": fresh_db
    }

@app.post("/api/bolna-session")
async def bolna_session_endpoint(payload: BolnaSessionRequest = Body(default=BolnaSessionRequest())):
    """
    Creates a Bolna Web Call session or returns transparent demo mode info.
    Protects API credentials server-side as required by Bolna documentation.
    """
    session_result = await create_bolna_web_call_session(payload.user_data)
    return session_result

@app.post("/api/agent/reason")
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

@app.post("/api/guardian/approve")
def guardian_approve_endpoint(payload: ApprovalActionRequest):
    """
    Handles guardian authorization decisions.
    Enforces the principle: AI coordinates. Humans authorize.
    """
    db = get_db()
    guardian = db.get("guardian", {})
    pending = guardian.get("pending_approvals", [])
    
    target_idx = None
    for idx, item in enumerate(pending):
        if item.get("id") == payload.approval_id:
            target_idx = idx
            break
            
    if target_idx is None:
        raise HTTPException(status_code=404, detail="Pending approval request not found")
        
    approval = pending.pop(target_idx)
    approval["status"] = payload.decision
    approval["decided_at"] = datetime.datetime.now().strftime("%I:%M %p Today")
    approval["decided_by"] = payload.authorized_by
    approval["notes"] = payload.notes
    
    # If medicine order approved, update cart and add activity
    if approval.get("action_type") == "medicine_order_refill" and payload.decision == "approved":
        cart = db.get("cart", {})
        cart["status"] = "authorized_order_placed"
        cart["authorized_by"] = payload.authorized_by
        
        # Log to activity
        db.setdefault("activity_log", []).insert(0, {
            "id": f"ACT-{uuid.uuid4().hex[:6]}",
            "time": "Just now",
            "title": "Medicine Refill Order Authorized",
            "description": f"Priya Rao approved monthly refill. Dispatch scheduled via Apollo Pharmacy.",
            "type": "order"
        })
    elif approval.get("action_type") == "doctor_appointment_booking" and payload.decision == "approved":
        # Create appointment
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

@app.post("/api/reminders/toggle")
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

@app.post("/api/appointments/book")
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
    
    # Notify guardian
    send_guardian_notification(
        f"Appointment booked for Ramachandra ji with {slot['doctor_name']} ({slot['speciality']}) on {slot['date']} at {slot['time']}."
    )
    
    return {"status": "success", "appointment": new_apt, "appointments": db["appointments"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
