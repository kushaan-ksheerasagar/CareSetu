import { CareSetuState } from '../types';

export const INITIAL_CARESETU_STATE: CareSetuState = {
  patient: {
    id: "PAT-72-BLR",
    name: "Ramachandra Rao",
    salutation: "Sri",
    age: 72,
    gender: "Male",
    city: "Bengaluru, Karnataka",
    language_preference: "English",
    supported_languages: ["English", "ಕನ್ನಡ (Kannada)", "हिन्दी (Hindi)"],
    chronic_conditions: ["Mild Hypertension", "Type 2 Diabetes (Well Controlled)"],
    allergies: ["No known drug allergies (NKDA)"],
    emergency_contact: {
      name: "Priya Rao (Daughter)",
      phone: "+91 98450 12345",
      relationship: "Daughter / Primary Guardian",
      location: "Indiranagar, Bengaluru"
    }
  },
  guardian: {
    name: "Priya Rao",
    relationship: "Daughter & Primary Caregiver",
    phone: "+91 98450 12345",
    email: "priya.rao@example.com",
    whatsapp_active: true,
    notification_preferences: {
      medicine_refills: true,
      appointments: true,
      missed_doses: true,
      sensitive_actions: true
    },
    consent_sharing: true,
    pending_approvals: [],
    notifications: [
      {
        id: "NOTIF-101",
        timestamp: "08:35 AM Today",
        title: "Morning Dose Confirmed",
        message: "Ramachandra ji completed morning Metformin dose on time.",
        priority: "low",
        read: true
      }
    ]
  },
  previous_orders: [
    {
      order_id: "ORD-2024-9182",
      date: "2024-09-28",
      date_display: "28th September (Last Month)",
      status: "Delivered",
      pharmacy: "Apollo Pharmacy - Malleshwaram",
      items: [
        {
          medicine_id: "MED-001",
          name: "Amlong 5",
          generic_name: "Amlodipine Besylate 5mg",
          dosage: "5 mg",
          form: "Tablet",
          quantity: 30,
          unit: "tablets (1 strip of 30)",
          price: 68.0,
          price_per_pack: 68.0,
          item_total: 68.0,
          prescription_required: true,
          instruction: "1 tablet once daily after dinner"
        },
        {
          medicine_id: "MED-002",
          name: "Glycomet 500 SR",
          generic_name: "Metformin Hydrochloride 500mg SR",
          dosage: "500 mg SR",
          form: "Tablet",
          quantity: 60,
          unit: "tablets (4 strips of 15)",
          price: 82.0,
          price_per_pack: 82.0,
          item_total: 82.0,
          prescription_required: true,
          instruction: "1 tablet twice daily after breakfast & dinner"
        }
      ],
      total_amount: 150.0,
      delivery_address: "Flat 302, Gokul Nilaya, 8th Main, Malleshwaram, Bengaluru 560003",
      authorized_by: "Priya Rao (Guardian Approved)"
    }
  ],
  pharmacy_catalogue: [
    {
      id: "MED-001",
      name: "Amlong 5",
      generic_name: "Amlodipine Besylate 5mg",
      category: "Cardiovascular / Blood Pressure",
      dosage: "5 mg",
      form: "Tablet",
      pack_size: 30,
      unit: "tablets",
      price: 68.0,
      in_stock: true,
      stock_count: 140,
      prescription_required: true,
      manufacturer: "Micro Labs Ltd",
      common_usage: "Hypertension management"
    },
    {
      id: "MED-002",
      name: "Glycomet 500 SR",
      generic_name: "Metformin Hydrochloride 500mg SR",
      category: "Diabetes Management",
      dosage: "500 mg",
      form: "Tablet",
      pack_size: 60,
      unit: "tablets",
      price: 82.0,
      in_stock: true,
      stock_count: 220,
      prescription_required: true,
      manufacturer: "USV Pvt Ltd",
      common_usage: "Type 2 diabetes blood glucose control"
    },
    {
      id: "MED-003",
      name: "Shelcal 500",
      generic_name: "Calcium 500mg + Vitamin D3",
      category: "Bone Health / Supplement",
      dosage: "500 mg",
      form: "Tablet",
      pack_size: 30,
      unit: "tablets",
      price: 130.0,
      in_stock: true,
      stock_count: 85,
      prescription_required: false,
      manufacturer: "Torrent Pharmaceuticals",
      common_usage: "Bone density support in elderly"
    },
    {
      id: "MED-004",
      name: "Telma 40",
      generic_name: "Telmisartan 40mg",
      category: "Cardiovascular",
      dosage: "40 mg",
      form: "Tablet",
      pack_size: 30,
      unit: "tablets",
      price: 142.0,
      in_stock: true,
      stock_count: 60,
      prescription_required: true,
      manufacturer: "Glenmark",
      common_usage: "Blood pressure control"
    },
    {
      id: "MED-005",
      name: "Dolo 650",
      generic_name: "Paracetamol 650mg",
      category: "Analgesic / Antipyretic",
      dosage: "650 mg",
      form: "Tablet",
      pack_size: 15,
      unit: "tablets",
      price: 32.0,
      in_stock: true,
      stock_count: 300,
      prescription_required: false,
      manufacturer: "Micro Labs Ltd",
      common_usage: "Body ache and mild fever relief"
    }
  ],
  cart: {
    items: [],
    subtotal: 0.0,
    delivery_fee: 0.0,
    total: 0.0,
    status: "empty",
    requires_guardian_authorization: true
  },
  reminders: [
    {
      id: "REM-1",
      medicine_name: "Glycomet 500 SR",
      dosage: "1 tablet",
      time_slot: "08:30 AM",
      timing_label: "After Breakfast",
      frequency: "Daily",
      status: "completed",
      completed_at: "08:32 AM Today"
    },
    {
      id: "REM-2",
      medicine_name: "Shelcal 500",
      dosage: "1 tablet",
      time_slot: "02:00 PM",
      timing_label: "After Lunch",
      frequency: "Daily",
      status: "pending",
      completed_at: null
    },
    {
      id: "REM-3",
      medicine_name: "Amlong 5",
      dosage: "1 tablet",
      time_slot: "08:30 PM",
      timing_label: "After Dinner",
      frequency: "Daily",
      status: "pending",
      completed_at: null
    }
  ],
  appointments: [
    {
      id: "APT-1",
      doctor_name: "Dr. Ananya Sharma",
      speciality: "Cardiologist (DM Cardiology)",
      clinic: "Manipal Heart Centre, Old Airport Road",
      date: "05 Nov 2024",
      time: "11:30 AM",
      type: "Routine BP & ECG Review",
      status: "confirmed",
      guardian_notified: true
    }
  ],
  available_doctor_slots: [
    {
      slot_id: "SLOT-01",
      doctor_name: "Dr. Ananya Sharma",
      speciality: "Cardiology",
      hospital: "Manipal Heart Centre, Old Airport Road",
      qualification: "MBBS, MD, DM (Cardiology)",
      experience: "16 years",
      fee: 900,
      date: "Tomorrow, 02 Nov",
      time: "11:30 AM"
    },
    {
      slot_id: "SLOT-02",
      doctor_name: "Dr. Rajesh Rao",
      speciality: "Geriatric Medicine & General Health",
      hospital: "Sagar Clinic, Malleshwaram",
      qualification: "MBBS, MD (Medicine)",
      experience: "22 years",
      fee: 600,
      date: "Monday, 04 Nov",
      time: "10:00 AM"
    },
    {
      slot_id: "SLOT-03",
      doctor_name: "Dr. Meenakshi Sundaram",
      speciality: "Endocrinologist (Diabetes Specialist)",
      hospital: "Apollo Sugar Clinic, Rajajinagar",
      qualification: "MBBS, MD, DNB (Endocrinology)",
      experience: "14 years",
      fee: 850,
      date: "Tuesday, 05 Nov",
      time: "04:30 PM"
    }
  ],
  activity_log: [
    {
      id: "ACT-1",
      time: "Today, 08:32 AM",
      title: "Medicine Taken",
      description: "Ramachandra ji confirmed morning dose of Glycomet 500 SR.",
      type: "medicine"
    },
    {
      id: "ACT-2",
      time: "Yesterday, 04:15 PM",
      title: "Health Checkup Synced",
      description: "Blood pressure reading 128/82 mmHg recorded normal.",
      type: "vital"
    }
  ]
};
