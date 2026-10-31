import { CareSetuState, AgentReasoningResult, ApprovalRequest } from '../types';
import { INITIAL_CARESETU_STATE } from '../data/mockData';
import { runClientAgentReasoning } from './clientAgentFallback';

const STORAGE_KEY = 'caresetu_local_state';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiService {
  private backendAvailable: boolean | null = null;

  public async checkBackendHealth(): Promise<{ connected: boolean; info?: any }> {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
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
    fetch(`${API_BASE}/api/state/reset`, { method: 'POST' }).catch(() => {});
    return INITIAL_CARESETU_STATE;
  }

  public async runAgentReasoning(
    message: string,
    currentState: CareSetuState,
    language: string = 'English',
    geminiApiKey?: string
  ): Promise<{ result: AgentReasoningResult; nextState: CareSetuState }> {
    if (this.backendAvailable !== false) {
      try {
        const res = await fetch(`${API_BASE}/api/agent/reason`, {
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

          const stateRes = await fetch(`${API_BASE}/api/state`);
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

    // Client fallback
    const { result, nextState } = await runClientAgentReasoning(message, currentState, language, geminiApiKey);
    this.saveState(nextState);
    return { result, nextState };
  }

  public async requestGuardianApproval(
    approval: {
      action_type: string;
      title?: string;
      details: any;
      reason: string;
      approval_id?: string;
    },
    currentState: CareSetuState
  ): Promise<CareSetuState> {
    if (this.backendAvailable) {
      try {
        const res = await fetch(`${API_BASE}/api/guardian/request-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(approval)
        });
        if (res.ok) {
          const stateRes = await fetch(`${API_BASE}/api/state`);
          if (stateRes.ok) {
            const updated = await stateRes.json();
            this.saveState(updated);
            return updated;
          }
        }
      } catch (e) {
        console.warn("Backend request-approval call failed, using local sync", e);
      }
    }

    // Local fallback
    const nextState: CareSetuState = JSON.parse(JSON.stringify(currentState));
    const newApproval: ApprovalRequest = {
      id: approval.approval_id || `APPR-${Date.now().toString().slice(-5)}`,
      action_type: approval.action_type,
      title: approval.title || `Approval Request: ${approval.action_type.replace(/_/g, ' ')}`,
      details: approval.details,
      reason: approval.reason,
      guardian_name: nextState.guardian.name,
      guardian_phone: nextState.guardian.phone,
      status: 'pending',
      created_at: 'Just now'
    };
    nextState.guardian.pending_approvals.unshift(newApproval);
    nextState.guardian.notifications.unshift({
      id: `NOTIF-${Date.now()}`,
      timestamp: 'Just now',
      title: 'Action Needs Authorization',
      message: approval.reason,
      priority: 'high',
      read: false
    });
    nextState.activity_log.unshift({
      id: `ACT-${Date.now()}`,
      time: 'Just now',
      title: 'Guardian Approval Requested',
      description: `Refill authorization request sent to ${nextState.guardian.name}.`,
      type: 'approval'
    });
    this.saveState(nextState);
    return nextState;
  }

  public async approveGuardianAction(
    approvalId: string,
    decision: 'approved' | 'rejected',
    currentState: CareSetuState,
    notes?: string
  ): Promise<CareSetuState> {
    if (this.backendAvailable) {
      try {
        const res = await fetch(`${API_BASE}/api/guardian/approve`, {
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
          const stateRes = await fetch(`${API_BASE}/api/state`);
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

      if (approval.action_type === "medicine_order_refill") {
        if (decision === "approved") {
          nextState.cart.status = "authorized_order_placed";
          nextState.cart.authorized_by = "Priya Rao (Guardian Approved)";
          nextState.activity_log.unshift({
            id: `ACT-${Date.now()}`,
            time: "Just now",
            title: "Medicine Refill Order Authorized",
            description: "Priya Rao approved monthly refill. Dispatch scheduled via Apollo Pharmacy.",
            type: "order"
          });
        } else {
          nextState.cart.status = "authorization_rejected";
          nextState.cart.authorized_by = "Priya Rao (Declined)";
          nextState.activity_log.unshift({
            id: `ACT-${Date.now()}`,
            time: "Just now",
            title: "Refill Request Declined",
            description: "Priya Rao declined the monthly refill request.",
            type: "order"
          });
        }
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
