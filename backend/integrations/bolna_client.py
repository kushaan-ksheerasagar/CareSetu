"""
Bolna AI Integration Module for CareSetu
Handles real Web Call session minting with Bolna's official REST API:
POST https://api.bolna.ai/web-call/session

When credentials are not supplied, provides a clean integration layer with an
explicitly labelled demo mode (as required by the hackathon specifications).
"""

import os
import httpx
from typing import Dict, Any, Optional

BOLNA_API_BASE = os.environ.get("BOLNA_API_BASE", "https://api.bolna.ai")

def is_bolna_configured() -> bool:
    """Returns True if both Bolna API Key and Agent ID are configured."""
    key = os.environ.get("BOLNA_API_KEY", "").strip()
    agent_id = os.environ.get("BOLNA_AGENT_ID", "").strip()
    return bool(key and agent_id)

async def create_bolna_web_call_session(user_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Calls the official Bolna API to mint a single-use Web Call session credential.
    Protects the API key on the server-side while empowering browser client.
    """
    bolna_api_key = os.environ.get("BOLNA_API_KEY", "").strip()
    bolna_agent_id = os.environ.get("BOLNA_AGENT_ID", "").strip()
    
    if not bolna_api_key or not bolna_agent_id:
        return {
            "demo_mode": True,
            "connected": False,
            "reason": "CREDENTIALS_NOT_SET",
            "message": "Bolna AI credentials (BOLNA_API_KEY, BOLNA_AGENT_ID) are not configured. CareSetu is running in transparent Demo Voice Mode.",
            "provider": "Web Speech API (High-Fidelity Demo Voice Mode)",
            "languages": ["en-IN", "kn-IN", "hi-IN"],
            "session_id": "demo-session-local"
        }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {
                "Authorization": f"Bearer {bolna_api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "agent_id": bolna_agent_id,
                "user_data": user_data or {
                    "patient_name": "Ramachandra Rao",
                    "patient_age": 72,
                    "location": "Bengaluru, India"
                }
            }
            response = await client.post(
                f"{BOLNA_API_BASE}/web-call/session",
                headers=headers,
                json=payload
            )
            
            if response.status_code in (200, 201):
                data = response.json()
                return {
                    "demo_mode": False,
                    "connected": True,
                    "provider": "Bolna AI Web Call",
                    "agent_id": bolna_agent_id,
                    "session_data": data
                }
            else:
                return {
                    "demo_mode": True,
                    "connected": False,
                    "reason": f"BOLNA_API_ERROR_{response.status_code}",
                    "message": f"Bolna API returned status {response.status_code}: {response.text}",
                    "provider": "Web Speech API (Fallback Demo Mode)"
                }
    except Exception as e:
        return {
            "demo_mode": True,
            "connected": False,
            "reason": "CONNECTION_EXCEPTION",
            "message": f"Could not reach Bolna API ({str(e)}). Switching to Demo Voice Mode.",
            "provider": "Web Speech API (Fallback Demo Mode)"
        }
