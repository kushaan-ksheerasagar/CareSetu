import { CareSetuState, AgentReasoningResult } from '../types';
import { INITIAL_CARESETU_STATE } from '../data/mockData';
import { runClientAgentReasoning } from './clientAgentFallback';

const STORAGE_KEY = 'caresetu_local_state';

export class ApiService {
  private backendAvailable: boolean | null = null;

  public async checkBackendHealth(): Promise<{ connected: boolean; info?: any }> {
    try {
      const res = await fetch('/api/health', { method: 'GET' });
      if (res.ok) {
        const info = await res.json();
        this.backendAvailable = true;
        return { connected: true, info };
      }
    } catch (e) {
      this.backendAvailable = false;
    }
    return { connected: false };
  }

  public getSavedState(): CareSetuState {
    if (typeof window === 'undefined') return INITIAL_CARESETU_STATE;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Could not parse saved state", e);
      }
    }
    return INITIAL_CARESETU_STATE;
  }

  public saveState(state: CareSetuState) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }

  public resetState(): CareSetuState {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Also trigger backend reset if online
    fetch('/api/state/reset', { method: 'POST' }).catch(() => {});
    return INITIAL_CARESETU_STATE;
  }

  public async runAgentReasoning(
    message: string,
    currentState: CareSetuState,
    language: string = 'English',
    geminiApiKey?: string
  ): Promise<{ result: AgentReasoningResult; nextState: CareSetuState }> {
    // Attempt backend first if available
    if (this.backendAvailable !== false) {
      try {
        const res = await fetch('/api/agent/reason', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            language,
            custom_gemini_api_key: geminiApiKey,
            patient_id: currentState.patient.id
          })
        });

        if (res.ok) {
          const result: AgentReasoningResult = await res.json();
          this.backendAvailable = true;

          // Fetch updated state from backend
          const stateRes = await fetch('/api/state');
          if (stateRes.ok) {
            const nextState: CareSetuState = await stateRes.json();
            this.saveState(nextState);
            return { result, nextState };
          }
        }
      } catch (e) {
        console.warn("Backend reasoning call failed, falling back to client agent coordinator", e);
        this.backendAvailable = false;
      }
    }

    // Client-side fallback
    const { result, nextState } = await runClientAgentReasoning(message, currentState, language, geminiApiKey);
    this.saveState(nextState);
    return { result, nextState };
  }

  public async approveGuardianAction(
    approvalId: string,
    decision: 'approved' | 'rejected',
    currentState: CareSetuState,
    notes?: string
  ): Promise<CareSetuState> {
    if (this.backendAvailable) {
      try {
        const res = await fetch('/api/guardian/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approval_id: approvalId,
            decision,
            authorized_by: 'Priya Rao (Guardian)',
            notes
          })
        });
        if (res.ok) {
          const stateRes = await fetch('/api/state');
          if (stateRes.ok) {
            const updated = await stateRes.json();
            this.saveState(updated);
            return updated;
          }
        }
      } catch (e) {
        console.warn("Backend approve call failed, updating local state", e);
      }
    }

    // Local state fallback
    const nextState: CareSetuState = JSON.parse(JSON.stringify(currentState));
    const pending = nextState.guardian.pending_approvals;
    const targetIdx = pending.findIndex(a => a.id === approvalId);
    if (targetIdx !== -1) {
      const approval = pending.splice(targetIdx, 1)[0];
      approval.status = decision;
      approval.decided_at = "Just now";
      approval.decided_by = "Priya Rao (Guardian)";

      if (approval.action_type === "medicine_order_refill" && decision === "approved") {
        nextState.cart.status = "authorized_order_placed";
        nextState.cart.authorized_by = "Priya Rao (Guardian Approved)";
        nextState.activity_log.unshift({
          id: `ACT-${Date.now()}`,
          time: "Just now",
          title: "Medicine Refill Order Authorized",
          description: "Priya Rao approved monthly refill. Dispatch scheduled via Apollo Pharmacy.",
          type: "order"
        });
      } else if (approval.action_type === "doctor_appointment_booking" && decision === "approved") {
        nextState.appointments.unshift({
          id: `APT-${Date.now()}`,
          doctor_name: "Dr. Ananya Sharma",
          speciality: "Cardiologist",
          clinic: "Manipal Heart Centre, Old Airport Road",
          date: "Tomorrow",
          time: "11:30 AM",
          type: "Cardiology Consultation",
          status: "confirmed",
          guardian_notified: true
        });
        nextState.activity_log.unshift({
          id: `ACT-${Date.now()}`,
          time: "Just now",
          title: "Appointment Confirmed",
          description: "Consultation with Dr. Ananya Sharma confirmed for Tomorrow at 11:30 AM.",
          type: "appointment"
        });
      }
    }
    this.saveState(nextState);
    return nextState;
  }
}

export const apiService = new ApiService();
