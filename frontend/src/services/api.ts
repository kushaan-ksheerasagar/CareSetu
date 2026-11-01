import { CareSetuState, AgentReasoningResult, ApprovalRequest, PharmacyComparisonResult, MultiPharmacyOrder, PharmacyOption } from '../types';
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

  // -------------------------------------------------------------
  // MULTI-PHARMACY CLIENT METHODS
  // -------------------------------------------------------------
  public async getPharmacyProviders(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/api/pharmacy/providers`);
      if (res.ok) {
        const data = await res.json();
        return data.providers || [];
      }
    } catch (e) {
      console.warn("Could not fetch pharmacy providers", e);
    }
    return [
      { id: "evitalrx", name: "eVitalRx Verified Network", type: "direct_api", is_configured: false },
      { id: "medpay", name: "MedPay Pharmacy Network", type: "direct_api", is_configured: false },
      { id: "app_nav_tata_1mg", name: "Tata 1mg", type: "app_navigation", is_configured: true },
      { id: "app_nav_apollo", name: "Apollo 24/7 Pharmacy", type: "app_navigation", is_configured: true }
    ];
  }

  public async comparePharmacies(
    medicines?: any[],
    pincode: string = "560003"
  ): Promise<PharmacyComparisonResult> {
    try {
      const res = await fetch(`${API_BASE}/api/pharmacy/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicines, pincode })
      });
      if (res.ok) {
        const data = await res.json();
        return data.comparison;
      }
    } catch (e) {
      console.warn("Backend comparePharmacies failed, using local comparison fallback", e);
    }

    // High fidelity local comparison fallback
    return {
      query_medicines: medicines ? medicines.map(m => typeof m === 'string' ? m : m.name) : ["Amlong 5mg", "Glycomet 500 SR"],
      pincode: pincode,
      best_price_provider: "evitalrx",
      fastest_delivery_provider: "medpay",
      warnings: [],
      timestamp: new Date().toISOString(),
      options: [
        {
          provider_id: "evitalrx",
          provider_name: "eVitalRx Verified Network",
          provider_type: "direct_api",
          supported_capabilities: ["search", "order_submission", "order_tracking"],
          items: [
            {
              medicine_id: "evital-aml-5",
              name: "Amlong 5mg Tablet",
              pack_size: 15,
              quantity_packs: 1,
              total_units: 15,
              price_per_pack: 43.50,
              total_price: 43.50,
              prescription_required: true,
              in_stock: true,
              dosage_form: "Tablet",
              is_sustained_release: false
            },
            {
              medicine_id: "evital-gly-500",
              name: "Glycomet 500mg SR Tablet",
              pack_size: 20,
              quantity_packs: 1,
              total_units: 20,
              price_per_pack: 41.50,
              total_price: 41.50,
              prescription_required: true,
              in_stock: true,
              dosage_form: "Tablet",
              is_sustained_release: true
            }
          ],
          subtotal: 85.00,
          delivery_fee: 0.0,
          total: 85.00,
          estimated_delivery: "Today in 2-3 hours",
          is_serviceable: true,
          rating: 4.8,
          requires_prescription: true,
          pharmacy_branch: "Sagar Medicals (eVitalRx Verified Partner)",
          disclaimer: "Dispensed by local licensed pharmacy. Best price guarantee.",
          confidence_score: 0.98
        },
        {
          provider_id: "medpay",
          provider_name: "MedPay Express",
          provider_type: "direct_api",
          supported_capabilities: ["search", "order_submission", "order_tracking"],
          items: [
            {
              medicine_id: "medpay-aml-5",
              name: "Amlong 5mg Tablet",
              pack_size: 15,
              quantity_packs: 1,
              total_units: 15,
              price_per_pack: 44.50,
              total_price: 44.50,
              prescription_required: true,
              in_stock: true,
              dosage_form: "Tablet",
              is_sustained_release: false
            },
            {
              medicine_id: "medpay-gly-500",
              name: "Glycomet 500mg SR Tablet",
              pack_size: 20,
              quantity_packs: 1,
              total_units: 20,
              price_per_pack: 41.00,
              total_price: 41.00,
              prescription_required: true,
              in_stock: true,
              dosage_form: "Tablet",
              is_sustained_release: true
            }
          ],
          subtotal: 85.50,
          delivery_fee: 25.0,
          total: 110.50,
          estimated_delivery: "Within 90 mins (Express)",
          is_serviceable: true,
          rating: 4.7,
          requires_prescription: true,
          pharmacy_branch: "MedPay Hub - Malleshwaram",
          disclaimer: "Express delivery from nearest neighborhood partner.",
          confidence_score: 0.96
        },
        {
          provider_id: "app_nav_tata_1mg",
          provider_name: "Tata 1mg",
          provider_type: "app_navigation",
          supported_capabilities: ["app_deep_link"],
          items: [
            {
              medicine_id: "nav-1mg-aml",
              name: "Amlong 5mg Tablet",
              pack_size: 15,
              quantity_packs: 1,
              total_units: 15,
              price_per_pack: 45.00,
              total_price: 45.00,
              prescription_required: true,
              in_stock: true,
              dosage_form: "Tablet",
              is_sustained_release: false
            },
            {
              medicine_id: "nav-1mg-gly",
              name: "Glycomet 500mg SR Tablet",
              pack_size: 20,
              quantity_packs: 1,
              total_units: 20,
              price_per_pack: 43.00,
              total_price: 43.00,
              prescription_required: true,
              in_stock: true,
              dosage_form: "Tablet",
              is_sustained_release: true
            }
          ],
          subtotal: 88.00,
          delivery_fee: 25.0,
          total: 113.00,
          estimated_delivery: "Delivery in 24-48 hours",
          is_serviceable: true,
          rating: 4.6,
          requires_prescription: true,
          handoff_url: "https://www.1mg.com/search/all?name=Amlong%205mg",
          handoff_instructions: [
            "1. Tap 'Open Official Website' to view the item on Tata 1mg.",
            "2. Confirm pack size and Sustained Release formulation.",
            "3. Upload prescription and complete payment.",
            "4. Return to CareSetu to record dose tracking."
          ],
          disclaimer: "Assisted checkout on official 1mg portal. Payment completed directly.",
          confidence_score: 0.92
        }
      ]
    };
  }

  public async createPharmacyOrder(
    providerId: string,
    medicines?: any[],
    pincode: string = "560003"
  ): Promise<{ order: MultiPharmacyOrder; requires_authorization: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/api/pharmacy/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, medicines, pincode })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Backend createPharmacyOrder failed, falling back to local order", e);
    }

    const orderId = `CS-ORD-${Date.now().toString().slice(-6)}`;
    const mockOrder: MultiPharmacyOrder = {
      order_id: orderId,
      version: 1,
      patient_id: "PAT-72-BLR",
      patient_name: "Sri Ramachandra Rao",
      selected_provider_id: providerId,
      selected_provider_name: providerId.includes("evital") ? "eVitalRx Verified Network" : providerId.includes("medpay") ? "MedPay Express" : "Tata 1mg",
      selected_provider_type: providerId.startsWith("app_nav") ? "app_navigation" : "direct_api",
      items: [
        {
          medicine_id: "med-1",
          name: "Amlong 5mg Tablet",
          pack_size: 15,
          quantity_packs: 1,
          total_units: 15,
          price_per_pack: 43.50,
          total_price: 43.50,
          prescription_required: true,
          in_stock: true,
          dosage_form: "Tablet",
          is_sustained_release: false
        },
        {
          medicine_id: "med-2",
          name: "Glycomet 500mg SR Tablet",
          pack_size: 20,
          quantity_packs: 1,
          total_units: 20,
          price_per_pack: 41.50,
          total_price: 41.50,
          prescription_required: true,
          in_stock: true,
          dosage_form: "Tablet",
          is_sustained_release: true
        }
      ],
      subtotal: 85.00,
      delivery_fee: providerId.includes("evital") ? 0.0 : 25.0,
      total: providerId.includes("evital") ? 85.00 : 110.00,
      delivery_address: "42/1, 8th Cross, Malleshwaram, Bengaluru",
      pincode: pincode,
      state: "order_prepared",
      approvals: [],
      idempotency_key: `IDEM-${Date.now()}`,
      payment_authorized: false,
      payment_method: "Cash on Delivery / UPI upon arrival",
      audit_trail: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { order: mockOrder, requires_authorization: true };
  }

  public async approvePharmacyOrder(
    orderId: string,
    decision: 'approved' | 'rejected' = 'approved',
    authorizedBy: string = 'Sri Ramachandra Rao',
    role: string = 'patient'
  ): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/pharmacy/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, authorized_by: authorizedBy, role })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Backend approvePharmacyOrder failed, using mock approval", e);
    }

    return {
      status: "success",
      decision,
      message: `Order authorized by ${authorizedBy} (${role}).`
    };
  }

  public async submitPharmacyOrder(orderId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/pharmacy/orders/${orderId}/submit`, {
        method: 'POST'
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Backend submitPharmacyOrder failed, returning mock confirmation", e);
    }

    return {
      success: true,
      provider_order_id: `DISPATCH-${Date.now().toString().slice(-5)}`,
      status: "confirmed",
      message: "Order placed successfully. Partner pharmacy notified."
    };
  }

}

export const apiService = new ApiService();
