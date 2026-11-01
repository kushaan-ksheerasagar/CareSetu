export interface PatientProfile {
  id: string;
  name: string;
  salutation: string;
  age: number;
  gender: string;
  city: string;
  language_preference: string;
  supported_languages: string[];
  chronic_conditions: string[];
  allergies: string[];
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
    location: string;
  };
}

export interface GuardianProfile {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  whatsapp_active: boolean;
  notification_preferences: {
    medicine_refills: boolean;
    appointments: boolean;
    missed_doses: boolean;
    sensitive_actions: boolean;
  };
  consent_sharing: boolean;
  pending_approvals: ApprovalRequest[];
  notifications: GuardianNotification[];
}

export interface ApprovalRequest {
  id: string;
  action_type: string;
  title: string;
  details: any;
  reason: string;
  guardian_name: string;
  guardian_phone: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  decided_at?: string;
  decided_by?: string;
}

export interface GuardianNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  read: boolean;
}

export interface MedicineItem {
  medicine_id: string;
  name: string;
  generic_name?: string;
  dosage: string;
  form?: string;
  quantity: number;
  unit?: string;
  price: number;
  price_per_pack?: number;
  item_total?: number;
  prescription_required?: boolean;
  instruction?: string;
}

export interface PreviousOrder {
  order_id: string;
  date: string;
  date_display: string;
  status: string;
  pharmacy: string;
  items: MedicineItem[];
  total_amount: number;
  delivery_address: string;
  authorized_by: string;
}

export interface PharmacyItem {
  id: string;
  name: string;
  generic_name: string;
  category: string;
  dosage: string;
  form: string;
  pack_size: number;
  unit: string;
  price: number;
  in_stock: boolean;
  stock_count: number;
  prescription_required: boolean;
  manufacturer: string;
  common_usage: string;
}

export interface CartState {
  items: MedicineItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  delivery_address?: string;
  requires_guardian_authorization: boolean;
  authorized_by?: string;
}

export interface MedicineReminder {
  id: string;
  medicine_name: string;
  dosage: string;
  time_slot: string;
  timing_label: string;
  frequency: string;
  status: 'pending' | 'completed';
  completed_at?: string | null;
}

export interface Appointment {
  id: string;
  doctor_name: string;
  speciality: string;
  clinic: string;
  date: string;
  time: string;
  type: string;
  status: string;
  guardian_notified: boolean;
}

export interface AvailableDoctorSlot {
  slot_id: string;
  doctor_name: string;
  speciality: string;
  hospital: string;
  qualification: string;
  experience: string;
  fee: number;
  date: string;
  time: string;
}

export interface ActivityLogItem {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'medicine' | 'order' | 'appointment' | 'approval' | 'notification' | 'vital' | 'reminder';
}


export interface CareSetuState {
  patient: PatientProfile;
  guardian: GuardianProfile;
  previous_orders: PreviousOrder[];
  pharmacy_catalogue: PharmacyItem[];
  cart: CartState;
  reminders: MedicineReminder[];
  appointments: Appointment[];
  available_doctor_slots: AvailableDoctorSlot[];
  activity_log: ActivityLogItem[];
}

export interface ExecutedTool {
  tool_name: string;
  arguments: any;
  result: any;
}

export interface AgentReasoningResult {
  source: string;
  intent: string;
  plan: string[];
  executed_tools: ExecutedTool[];
  speech_response: string;
  requires_authorization: boolean;
  authorization_details?: any;
  updated_state?: Partial<CareSetuState>;
}


// -------------------------------------------------------------
// MULTI-PHARMACY TYPES
// -------------------------------------------------------------
export type IntegrationStatus = 'LIVE_STAGING' | 'MOCK_DEMO' | 'DISCONNECTED' | 'ERROR';

export type ProviderType = 'direct_api' | 'app_navigation' | 'disabled_partner' | 'simulated_demo';

export type OrderLifecycleState = 
  | 'draft'
  | 'searching'
  | 'options_available'
  | 'order_prepared'
  | 'awaiting_user_approval'
  | 'awaiting_guardian_approval'
  | 'approved'
  | 'submitted'
  | 'provider_pending'
  | 'modification_requested'
  | 'payment_pending'
  | 'confirmed'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export interface MultiPharmacyMedicineItem {
  medicine_id: string;
  name: string;
  generic_name?: string;
  brand_name?: string;
  strength?: string;
  dosage_form: string;
  is_sustained_release: boolean;
  manufacturer?: string;
  pack_size: number;
  quantity_packs: number;
  total_units: number;
  price_per_pack: number;
  total_price: number;
  prescription_required: boolean;
  in_stock: boolean;
  stock_count?: number;
  sku_code?: string;
  instructions?: string;
  is_substitution?: boolean;
  substitution_details?: any;
}

export interface PharmacyOption {
  provider_id: string;
  provider_name: string;
  provider_type: ProviderType;
  supported_capabilities: string[];
  items: MultiPharmacyMedicineItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  estimated_delivery: string;
  is_serviceable: boolean;
  serviceability_message?: string;
  rating: number;
  requires_prescription: boolean;
  pharmacy_branch?: string;
  handoff_url?: string;
  handoff_instructions?: string[];
  disclaimer?: string;
  confidence_score: number;
  integration_status?: IntegrationStatus;
  status_message?: string;
  delivery_tiers?: Record<string, { serviceable: boolean; label?: string; status?: string }>;
  pricing_mode?: string;
  is_quote_confirmed?: boolean;
}

export interface PharmacyComparisonResult {
  query_medicines: string[];
  pincode: string;
  options: PharmacyOption[];
  best_price_provider?: string;
  fastest_delivery_provider?: string;
  warnings: string[];
  timestamp: string;
}

export interface MultiPharmacyOrder {
  order_id: string;
  version: number;
  patient_id: string;
  patient_name: string;
  selected_provider_id: string;
  selected_provider_name: string;
  selected_provider_type: ProviderType;
  items: MultiPharmacyMedicineItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  pincode: string;
  state: OrderLifecycleState;
  approvals: any[];
  provider_order_id?: string;
  handoff_url?: string;
  handoff_details?: any;
  idempotency_key: string;
  payment_authorized: boolean;
  payment_method: string;
  audit_trail: any[];
  created_at: string;
  updated_at: string;
}
