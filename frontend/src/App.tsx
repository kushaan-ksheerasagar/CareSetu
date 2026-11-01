import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VoiceAssistant } from './components/VoiceAssistant';
import { AgentTrace } from './components/AgentTrace';
import { MedicineOrderModal } from './components/MedicineOrderModal';
import { GuardianSection } from './components/GuardianSection';
import { MedicineReminders } from './components/MedicineReminders';
import { DoctorAppointments } from './components/DoctorAppointments';
import { PrivacySafetyModal } from './components/PrivacySafetyModal';
import { SettingsModal } from './components/SettingsModal';
import { apiService } from './services/api';
import { speechService } from './services/speechService';
import { Clock, Activity } from 'lucide-react';
import type { CareSetuState, AgentReasoningResult, AvailableDoctorSlot, PreviousOrder } from './types';




export const App: React.FC = () => {
  const [state, setState] = useState<CareSetuState>(() => apiService.getSavedState());
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('English');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('caresetu_gemini_key') || '');
  const [bolnaActive, setBolnaActive] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastAgentResult, setLastAgentResult] = useState<AgentReasoningResult | null>(null);

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Live IST Clock
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check backend health on mount
  useEffect(() => {
    apiService.checkBackendHealth().then((res) => {
      setIsBackendConnected(res.connected);
      if (res.connected && res.info?.services?.bolna_voice_ai?.configured) {
        setBolnaActive(true);
      }
    });
  }, []);

  // Handle Voice / Text request through Agentic Loop
  const handleProcessRequest = async (message: string) => {
    setIsProcessing(true);
    setStatusMessage('CareSetu Agent is analyzing request and determining plan...');

    try {
      const { result, nextState } = await apiService.runAgentReasoning(
        message,
        state,
        currentLanguage,
        geminiApiKey
      );

      setLastAgentResult(result);
      setState(nextState);

      // If the workflow prepared a medicine refill cart, open the Order Authorization Modal automatically!
      if (
        result.requires_authorization &&
        result.authorization_details?.type === 'medicine_order_refill'
      ) {
        setTimeout(() => {
          setShowOrderModal(true);
        }, 800);
      }
    } catch (err: any) {
      console.error("Agent reasoning error:", err);
      setStatusMessage("An issue occurred during coordination. Please try again.");
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // Authorize order independently
  const handleAuthorizeSelf = (selectedProvider?: string) => {
    const provider = selectedProvider || 'eVitalRx Verified Network';
    const nextState: CareSetuState = JSON.parse(JSON.stringify(state));
    nextState.cart.status = 'authorized_order_placed';
    nextState.cart.authorized_by = 'Ramachandra Rao (Self Authorized)';
    nextState.activity_log.unshift({
      id: `ACT-${Date.now()}`,
      time: 'Just now',
      title: 'Medicine Refill Order Placed',
      description: 'Ramachandra ji authorized monthly medicine refill via Apollo Pharmacy.',
      type: 'order'
    });
    setState(nextState);
    apiService.saveState(nextState);
    setShowOrderModal(false);
    if (!bolnaActive) {
      speechService.speak(`Monthly medicine refill authorized. Your order has been placed with ${provider}.`);
    }
  };

  // Request Priya's Approval
  const handleRequestGuardianApproval = async (selectedProvider?: string) => {
    const provider = selectedProvider || 'eVitalRx Verified Network';
    const approvalId = `APPR-${Date.now().toString().slice(-5)}`;
    const updatedState = await apiService.requestGuardianApproval(
      {
        approval_id: approvalId,
        action_type: 'medicine_order_refill',
        title: 'Monthly Medicine Refill (Amlong 5 + Glycomet 500 SR)',
        details: {
          total_amount: state.cart.total || 150.0,
          items: state.cart.items
        },
        reason: `Ramachandra ji requested the same medicine ordered last month. Please authorize refill of ₹${(state.cart.total || 150.0).toFixed(2)}.`
      },
      state
    );

    setState(updatedState);
    setShowOrderModal(false);
    if (!bolnaActive) {
      speechService.speak(`Authorization request for ${provider} order sent to Priya on WhatsApp. Once she approves, your order will be dispatched.`);
    }
  };

  // Guardian Approves
  const handleGuardianApprove = async (approvalId: string) => {
    const updatedState = await apiService.approveGuardianAction(approvalId, 'approved', state);
    setState(updatedState);
    if (!bolnaActive) {
      speechService.speak("Priya has approved the medicine refill request! Apollo Pharmacy is preparing your dispatch.");
    }
  };

  // Guardian Rejects
  const handleGuardianReject = async (approvalId: string) => {
    const updatedState = await apiService.approveGuardianAction(approvalId, 'rejected', state);
    setState(updatedState);
    if (!bolnaActive) {
      speechService.speak("Priya reviewed the refill request and declined it.");
    }
  };

  // Toggle Reminder
  const handleToggleReminder = (reminderId: string, nextStatus: 'completed' | 'pending') => {
    const nextState: CareSetuState = JSON.parse(JSON.stringify(state));
    const target = nextState.reminders.find((r) => r.id === reminderId);
    if (target) {
      target.status = nextStatus;
      if (nextStatus === 'completed') {
        target.completed_at = 'Just now';
        nextState.activity_log.unshift({
          id: `ACT-${Date.now()}`,
          time: 'Just now',
          title: 'Dose Completed',
          description: `Ramachandra ji took ${target.medicine_name} (${target.timing_label}).`,
          type: 'medicine'
        });
      } else {
        target.completed_at = null;
      }
    }
    setState(nextState);
    apiService.saveState(nextState);
    if (nextStatus === 'completed' && !bolnaActive && target) {
      speechService.speak(`Dose confirmed. You took your ${target.medicine_name}. Well done!`);
    }
  };

  // Add Reminder
  const handleAddReminder = (name: string, time: string, meal: string) => {
    const nextState: CareSetuState = JSON.parse(JSON.stringify(state));
    nextState.reminders.push({
      id: `REM-${Date.now()}`,
      medicine_name: name,
      dosage: '1 tablet',
      time_slot: time,
      timing_label: meal,
      frequency: 'Daily',
      status: 'pending',
      completed_at: null
    });
    nextState.activity_log.unshift({
      id: `ACT-${Date.now()}`,
      time: 'Just now',
      title: 'Reminder Created',
      description: `Daily schedule for ${name} at ${time} (${meal}).`,
      type: 'reminder'
    });
    setState(nextState);
    apiService.saveState(nextState);
  };

  // Book Doctor Slot
  const handleBookDoctorSlot = (slot: AvailableDoctorSlot) => {
    const nextState: CareSetuState = JSON.parse(JSON.stringify(state));
    nextState.appointments.unshift({
      id: `APT-${Date.now()}`,
      doctor_name: slot.doctor_name,
      speciality: slot.speciality,
      clinic: slot.hospital,
      date: slot.date,
      time: slot.time,
      type: 'Routine Consultation',
      status: 'confirmed',
      guardian_notified: true
    });
    nextState.guardian.notifications.unshift({
      id: `NOTIF-${Date.now()}`,
      timestamp: 'Just now',
      title: 'Appointment Booked',
      message: `Appointment confirmed with ${slot.doctor_name} on ${slot.date} at ${slot.time}.`,
      priority: 'normal',
      read: false
    });
    nextState.activity_log.unshift({
      id: `ACT-${Date.now()}`,
      time: 'Just now',
      title: 'Appointment Booked',
      description: `Consultation confirmed with ${slot.doctor_name} (${slot.date} at ${slot.time}).`,
      type: 'appointment'
    });
    setState(nextState);
    apiService.saveState(nextState);
    if (!bolnaActive) {
      speechService.speak(`Consultation booked with ${slot.doctor_name} for ${slot.date} at ${slot.time}. Priya has been notified.`);
    }
  };

  // Reset to fresh demo
  const handleResetDemoState = () => {
    const fresh = apiService.resetState();
    setState(fresh);
    setLastAgentResult(null);
  };

  const saveGeminiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('caresetu_gemini_key', key);
  };

  const previousOrder: PreviousOrder | null = state.previous_orders[0] || null;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0F294A] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        patient={state.patient}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        onOpenPrivacy={() => setShowPrivacyModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onResetState={handleResetDemoState}
        isBackendConnected={isBackendConnected}
        bolnaActive={bolnaActive}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Welcome Hero Greeting */}
        <section className="bg-gradient-to-r from-[#0F294A] via-[#163A66] to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-teal-500/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-teal-200 text-xs font-semibold mb-3 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Elder Healthcare Coordination Platform
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
                Namaste, {state.patient.salutation} {state.patient.name}!
              </h1>
              <p className="text-slate-200 text-sm sm:text-base font-medium max-w-xl leading-relaxed">
                I am your Voice-First Healthcare Coordinator. Speak naturally to refill your monthly medicines, check appointments, or message your daughter Priya.
              </p>
            </div>

            {/* Live Date Time & Vitals Summary */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shrink-0 min-w-[280px]">
              <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold mb-2">
                <Clock className="w-4 h-4" />
                <span>Live Indian Standard Time (IST)</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-white mb-3">
                {currentTimeStr || "Loading time..."}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/15">
                <div>
                  <span className="text-slate-300 block text-[11px]">Primary Guardian:</span>
                  <span className="font-bold text-white">{state.guardian.name}</span>
                </div>
                <div>
                  <span className="text-slate-300 block text-[11px]">Status:</span>
                  <span className="font-bold text-emerald-300">Protected & Synced</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Voice Assistant & Real Agentic Loop Trace (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* The Voice Assistant */}
            <VoiceAssistant
              onProcessRequest={handleProcessRequest}
              isProcessing={isProcessing}
              currentLanguage={currentLanguage}
              bolnaActive={bolnaActive}
              lastResponse={lastAgentResult?.speech_response}
              statusMessage={statusMessage}
            />

            {/* Step-by-Step Agentic AI Trace (Crucial for Hackathon Judges) */}
            <AgentTrace
              reasoningResult={lastAgentResult}
              isProcessing={isProcessing}
            />

            {/* Recent Healthcare Activity Stream */}
            <div className="bg-white rounded-3xl border border-[#E9E4DC] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-teal-700" />
                  <h3 className="text-base font-bold text-[#0F294A]">
                    Recent Healthcare Activities
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Audited & Timestamped
                </span>
              </div>

              <div className="space-y-3">
                {state.activity_log.slice(0, 4).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE8DC] text-xs"
                  >
                    <div className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{act.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{act.time}</span>
                      </div>
                      <p className="text-slate-600 font-medium mt-0.5">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Medicine Schedule, Doctor Consults & Guardian Coordination (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Guardian Authorization & Alerts */}
            <GuardianSection
              guardian={state.guardian}
              onApprove={handleGuardianApprove}
              onReject={handleGuardianReject}
              onToggleConsent={(enabled) => {
                const next = JSON.parse(JSON.stringify(state));
                next.guardian.consent_sharing = enabled;
                setState(next);
                apiService.saveState(next);
              }}
            />

            {/* Daily Medicine Reminders */}
            <MedicineReminders
              reminders={state.reminders}
              onToggleReminder={handleToggleReminder}
              onAddReminder={handleAddReminder}
            />

            {/* Doctor Consultations & Simulated Booking */}
            <DoctorAppointments
              appointments={state.appointments}
              availableSlots={state.available_doctor_slots}
              onBookSlot={handleBookDoctorSlot}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-[#EBE3D6] py-6 px-4 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F294A]">CareSetu (केयरसेतु)</span>
            <span>•</span>
            <span>Voice-First Agentic AI Healthcare Coordinator for Elders</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>Core Principle: <strong>AI coordinates. Humans authorize.</strong></span>
          </div>
        </div>
      </footer>

      {/* Primary Demonstration Workflow Modal: Medicine Refill & Human Authorization Choice */}
      <MedicineOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        cart={state.cart}
        previousOrder={previousOrder}
        onAuthorizeSelf={handleAuthorizeSelf}
        onRequestGuardianApproval={handleRequestGuardianApproval}
      />

      {/* Privacy and Safety Principles Modal */}
      <PrivacySafetyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* Settings Modal (Gemini API Key, Bolna Web Call) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        geminiApiKey={geminiApiKey}
        onSaveGeminiApiKey={saveGeminiKey}
        bolnaActive={bolnaActive}
        onToggleBolnaActive={setBolnaActive}
      />
    </div>
  );
};

export default App;
