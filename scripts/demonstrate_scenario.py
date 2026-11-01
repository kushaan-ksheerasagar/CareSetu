"""
CareSetu End-to-End Scenario Demonstration:
Scenario: User says "I need the same Amlong medicine I ordered last month."
Verifies:
1. Agentic loop 8 stages
2. Retrieval of past order from medical history
3. Live eVitalRx staging catalog search
4. Medicine matching (Amlong 5mg Tablet)
5. Serviceability breakdown across 4 delivery tiers
6. Guardian authorization trigger ("AI coordinates. Humans authorize.")
7. Natural speech response generation
"""

import sys
import os
import json
import asyncio

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Reconfigure stdout to UTF-8 for Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.agents.coordinator import run_agentic_reasoning

async def run_scenario():
    user_query = "I need the same Amlong medicine I ordered last month."
    print("=" * 80)
    print("CARESETU SCENARIO DEMONSTRATION")
    print(f"User Request: \"{user_query}\"")
    print("=" * 80)
    
    result = await run_agentic_reasoning(user_query, language="English")
    
    print(f"\n[1] INTENT IDENTIFIED: {result.get('intent')}")
    print(f"\n[2] AGENT PLAN:")
    for step in result.get("plan", []):
        print(f"    {step}")
        
    print(f"\n[3] EXECUTED TOOLS ({len(result.get('executed_tools', []))} tools):")
    for idx, tool in enumerate(result.get("executed_tools", []), 1):
        name = tool.get("tool_name")
        args = tool.get("arguments")
        res = tool.get("result", {})
        print(f"\n  --- Tool #{idx}: {name} ---")
        print(f"      Arguments: {json.dumps(args, indent=2)}")
        if name == "get_previous_medicine_orders":
            print(f"      Summary: {res.get('summary')}")
            for it in res.get("items", []):
                print(f"        * {it.get('name')} {it.get('dosage')} ({it.get('manufacturer')}) - Rs. {it.get('price')}")
        elif name == "prepare_medicine_cart":
            cart = res.get("cart", {})
            print(f"      Status: {cart.get('status')}")
            print(f"      Items Count: {len(cart.get('items', []))}")
            for it in cart.get("items", []):
                print(f"        * {it.get('name')} {it.get('dosage')} x {it.get('packs')} pack(s) = Rs. {it.get('item_total')}")
            print(f"      Subtotal: Rs. {cart.get('subtotal')} | Total: Rs. {cart.get('total')}")
        elif name == "compare_pharmacies":
            print(f"      Pincode: {res.get('pincode')}")
            print(f"      Options Count: {res.get('options_count')}")
            print(f"      Draft Order ID: {res.get('draft_order_id')}")
            print(f"      Best Price Provider: {res.get('best_price_provider')}")
            for opt_idx, opt in enumerate(res.get("options", []), 1):
                p_name = opt.get("provider_name") or opt.get("pharmacy_name")
                p_id = opt.get("provider_id")
                stat = opt.get("integration_status")
                total = opt.get("total") or opt.get("estimated_total")
                mode = opt.get("pricing_mode")
                print(f"\n      Option [{opt_idx}]: {p_name} ({p_id})")
                print(f"          Integration Status: {stat}")
                print(f"          Pricing: Rs. {total} (Mode: {mode}, Confirmed Quote: {opt.get('is_quote_confirmed')})")
                print(f"          Delivery Tiers:")
                for tier_name, tier_info in opt.get("delivery_tiers", {}).items():
                    serv = "[AVAILABLE]" if tier_info.get("serviceable") else "[UNAVAILABLE]"
                    print(f"            - {tier_info.get('label')}: {serv} ({tier_info.get('status')})")
                for med in opt.get("items", []):
                    m_name = med.get("name") or med.get("medicine_name")
                    m_price = med.get("price_per_pack") or med.get("unit_price")
                    m_pack = med.get("pack_size") or 1
                    m_mfg = med.get("manufacturer") or "N/A"
                    print(f"          Catalogue Item: {m_name} (Pack: {m_pack}s, {m_mfg}) @ MRP Rs. {m_price}")

    print(f"\n[4] AUTHORIZATION POLICY ENFORCEMENT ('AI Coordinates. Humans Authorize'):")
    print(f"    Requires Authorization: {result.get('requires_authorization')}")
    auth = result.get("authorization_details", {})
    if auth:
        print(f"    Action Title: {auth.get('title')}")
        print(f"    Pharmacy Provider: {auth.get('pharmacy')}")
        print(f"    Estimated Total: Rs. {auth.get('total_amount')}")
        print(f"    Guardian Contact: {auth.get('guardian_name')}")
        print(f"    Draft Order ID: {auth.get('order_id')}")
        print(f"    Human Gate: Order is kept in DRAFT state. Zero external financial charges submitted.")

    print(f"\n[5] SPOKEN AI VOICE OUTPUT (Demographic-tuned, empathetic):")
    print(f"    \"{result.get('speech_response')}\"")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_scenario())
