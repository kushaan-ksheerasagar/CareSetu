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
