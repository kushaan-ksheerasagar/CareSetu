# CareSetu (केयरसेतु)
### Voice-First Agentic AI Healthcare Coordinator for Elders in India

> **Core Principle:** *AI coordinates. Humans authorize.*

CareSetu is a compassionate, voice-first agentic healthcare coordinator built for elderly citizens in India. It empowers elders to independently handle everyday healthcare tasks—re-ordering monthly chronic medicines, setting pill reminders, scheduling doctor appointments, and updating family caregivers—through natural voice conversations.

CareSetu follows a strict safety charter: **The AI agent never autonomously charges bank accounts or alters medication dosages.** It coordinates plans, executes verified tools, verifies results, and routes sensitive actions through explicit elder or guardian authorization.

---

## 🌟 Hackathon Highlights & Capabilities

- **🎙️ Real-Time Voice Interaction:** Large elderly-accessible microphone interface with audio soundwave feedback, speech synthesis, and live conversation transcripts in Indian English, ಕನ್ನಡ (Kannada), and हिन्दी (Hindi).
- **⚡ Official Bolna AI Web Call Integration:** Uses the official `@bolna/web-call` SDK alongside a secure server-side session minting proxy (`/api/bolna-session`). Includes a high-fidelity **Demo Voice Mode** (Web Speech API) when live Bolna credentials are not configured, clearly distinguishing implemented from simulated modes.
- **🧠 Gemini-Powered Agentic Loop:** Implements the complete 8-stage agentic workflow:
  1. *Understand Request*
  2. *Identify Intent & Entities*
  3. *Create Step-by-Step Action Plan*
  4. *Select Tools from Healthcare Registry*
  5. *Execute Real Functions*
  6. *Verify Outputs & Apply Constraints*
  7. *Explain Outcome in Respectful Pacing*
  8. *Enforce Human Authorization Gate*
- **👁️ Live Agentic Execution Trace:** Live audit drawer showing judges the agent's plan, tool invocations, arguments, and return values in real-time.
- **👨‍👩‍👧 Family & Guardian Coordination:** Linked caregiver profile (Priya Rao, Daughter, Bengaluru) with an interactive approval queue, WhatsApp alerts, and consent sharing controls.
- **🎨 Elderly-Centered Visual Identity:** Warm cream background (`#FAF8F5`), navy blue typography (`#0F294A`), soft teal/green accents, high-contrast text, and generous touch targets.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, TypeScript |
| **Styling** | Tailwind CSS v4, Lucide Icons, Plus Jakarta Sans & Outfit Fonts |
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **Voice Agent** | Bolna AI (`@bolna/web-call` SDK + REST API) & Web Speech API fallback |
| **Agent Reasoning** | Google Gemini API (`gemini-1.5-flash`) + Deterministic Registry Fallback |
| **Database** | Synchronized in-memory / localStorage state with Indian geriatric records |
| **Deployment** | Vercel-ready with zero-config client fallback |

---

## 🏗️ Architecture & Project Structure

```text
CareSetu/
├── backend/
│   ├── main.py                  # FastAPI REST API, endpoints, CORS, state syncing
│   ├── database/
│   │   └── mock_db.py           # Indian geriatric records (Ramachandra Rao, 72y), pharmacy catalogue
│   ├── tools/
│   │   └── healthcare_tools.py  # search_medicine, prepare_medicine_cart, get_previous_medicine_orders, etc.
│   ├── agents/
│   │   └── coordinator.py       # 8-stage Gemini Agent reasoning loop & tool dispatcher
│   └── integrations/
│       └── bolna_client.py      # Bolna REST API Web Call session minting proxy
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx             # CareSetu header, live IST clock, language switcher
│   │   │   ├── VoiceAssistant.tsx     # Large microphone, soundwave, transcript, quick prompts
│   │   │   ├── AgentTrace.tsx         # Real-time agent plan & tool execution audit trace
│   │   │   ├── MedicineOrderModal.tsx # Primary workflow modal with human authorization choice
│   │   │   ├── GuardianSection.tsx    # Priya Rao (Daughter) card, approval queue, alerts
│   │   │   ├── MedicineReminders.tsx  # Daily pill schedule, completion checkbox, add reminder
│   │   │   ├── DoctorAppointments.tsx # Specialist consults (Cardiology, Geriatrics)
│   │   │   ├── PrivacySafetyModal.tsx # 5 core safety principles modal
│   │   │   └── SettingsModal.tsx      # API key configurations (Gemini, Bolna)
│   │   ├── services/
│   │   │   ├── api.ts                 # Unifies backend FastAPI and local client fallback
│   │   │   ├── speechService.ts       # Speech-to-text & speech synthesis for elderly
│   │   │   ├── bolnaWebCall.ts        # Official @bolna/web-call SDK wrapper
│   │   │   └── clientAgentFallback.ts # Browser agent engine for standalone/Vercel runs
│   │   ├── types/
│   │   │   └── index.ts               # Complete TypeScript interfaces
│   │   ├── data/
│   │   │   └── mockData.ts            # Baseline mock dataset
│   │   ├── App.tsx                    # Main CareSetu dashboard assembly
│   │   └── index.css                  # Tailwind v4 theme, fonts, animations
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── vercel.json                  # Vercel deployment configuration
├── .env.example                 # Environment variables template
├── package.json                 # Root script runner
└── README.md
```

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### 1. Clone & Install Dependencies
```bash
# In the project root
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install Python backend dependencies
pip install fastapi uvicorn google-generativeai python-dotenv httpx pydantic
```

### 2. Configure Environment Variables (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate keys if available:
```env
# Optional: Live Gemini reasoning
GEMINI_API_KEY=your_gemini_api_key

# Optional: Live Bolna voice agent
BOLNA_API_KEY=your_bolna_api_key
BOLNA_AGENT_ID=your_bolna_agent_id
```
*(Note: If credentials are not provided, CareSetu automatically runs in high-fidelity Demo Voice Mode using browser speech recognition, speech synthesis, and local tool execution!)*

### 3. Run Locally

#### Option A: Run Both Together
```bash
# Terminal 1 - Start FastAPI Backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 - Start Vite Frontend
cd frontend
npm run dev
```

#### Option B: Standalone Frontend
You can also run the frontend by itself:
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in Chrome or Edge.

---

## ⚡ 60-Second Hackathon Judge Demonstration Walkthrough

To experience the complete end-to-end agentic workflow:

1. **Open CareSetu:** Navigate to `http://localhost:3000`. Notice the warm greeting for **Sri Ramachandra Rao (72y)**, live Indian Standard Time (IST), and pill schedule.
2. **Click Voice Prompt or Speak:** 
   - Either tap the large teal microphone and say:
     > *"I need the same medicine I ordered last month."*
   - Or click the quick prompt button: **"Same Medicine Refill"**.
3. **Observe the Agentic Loop:**
   - The **Conversation Transcript** streams the voice exchange.
   - The **Agentic Loop & Tool Execution Trace** expands, showing:
     * *Plan Step 1:* Check patient medical history (`get_previous_medicine_orders`).
     * *Plan Step 2:* Match products with verified pharmacy catalogue.
     * *Plan Step 3:* Prepare refill cart with **Amlong 5mg** & **Glycomet 500 SR** (`prepare_medicine_cart`).
     * *Plan Step 4:* Verify safety policy: *AI coordinates. Humans authorize.*
4. **Inspect the Refill Summary Modal:**
   - An itemized invoice for ₹150.00 appears with doctor prescriptions and Apollo Pharmacy delivery details.
   - You are offered two clear choices:
     * **Option 1: Authorize Myself** (Elder proceeds independently)
     * **Option 2: Request Priya's Approval** (Routes to daughter's caregiver portal)
5. **Demonstrate Guardian Authorization:**
   - Click **"Request Priya's Approval"**.
   - Scroll to **Family & Guardian Coordination** in the right column.
   - Notice the pending request under Priya Rao's portal: `[Action Authorization Required: APPR-XXXX]`.
   - Click **"Approve as Priya (Guardian)"**.
   - The refill order is authorized and recorded in the audited **Recent Healthcare Activities** log!

---

## 🔒 Privacy, Safety & Ethical Agent Design

CareSetu was built from the ground up for vulnerable elderly citizens:

1. **Explicit Elder Consent:** The microphone is only active upon direct user click; no continuous passive surveillance.
2. **Zero Autonomous Payments:** CareSetu prepares carts and calculates subtotals, but never auto-debits bank accounts, handles card PINs, or completes unauthorized transactions.
3. **Zero Autonomous Medication Changes:** CareSetu never prescribes drugs or substitutes alternative molecules without a verified physician prescription in medical history.
4. **Caregiver Consent Gates:** Health information is only shared with guardians (e.g., daughter Priya) when the elder's consent toggle is explicitly active.
5. **Secure Credential Handling:** Bolna and Gemini API tokens are kept protected on server routes or in browser local storage.

---

## 🌐 Deploy to Vercel

CareSetu is structured for 1-click Vercel deployment:

1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. The included `vercel.json` automatically configures Vite compilation to `frontend/dist`.
4. Add `GEMINI_API_KEY`, `BOLNA_API_KEY`, and `BOLNA_AGENT_ID` in Vercel Environment Variables if desired.
5. Deploy! The frontend includes client-side fallback coordinators that guarantee **100% functionality** on Vercel even without a Python server.

---

## 📄 License
MIT License. Built for the Voice & Agentic AI Healthcare Hackathon.
