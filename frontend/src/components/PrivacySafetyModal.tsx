import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, EyeOff, UserCheck, X } from 'lucide-react';

interface PrivacySafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacySafetyModal: React.FC<PrivacySafetyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const principles = [
    {
      title: "1. Explicit User Consent & Control",
      desc: "CareSetu operates solely on demand. No background listening or continuous surveillance occurs without the elder pressing the microphone.",
      icon: <EyeOff className="w-5 h-5 text-teal-700" />
    },
    {
      title: "2. Zero Autonomous Payments",
      desc: "CareSetu coordinates carts and prepares invoices, but NEVER stores CVVs, debit card PINs, or auto-debits bank accounts. Elders or guardians verify all charges.",
      icon: <Lock className="w-5 h-5 text-indigo-700" />
    },
    {
      title: "3. Zero Autonomous Medication Changes",
      desc: "CareSetu does not prescribe or substitute drugs. It only matches against previous doctor prescriptions from verified history.",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />
    },
    {
      title: "4. Guardian Sharing Only With Elder Consent",
      desc: "Information is only shared with designated guardians (such as daughter Priya) when the elder has granted explicit consent in their profile.",
      icon: <UserCheck className="w-5 h-5 text-emerald-700" />
    },
    {
      title: "5. Server-Side Security & Key Protection",
      desc: "Third-party Bolna and Gemini API tokens are kept protected on server routes, preventing credential leaks in browser inspection.",
      icon: <ShieldCheck className="w-5 h-5 text-teal-700" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E9E4DC] p-6 sm:p-8 max-w-xl w-full shadow-2xl text-[#0F294A]">
        <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100/70 text-teal-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">CareSetu Safety Principles</h2>
              <p className="text-xs text-slate-500 font-medium">Core principle: AI coordinates. Humans authorize.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1">
          {principles.map((p, idx) => (
            <div key={idx} className="bg-[#FAF8F5] border border-[#EBE3D6] rounded-2xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#E0D7C9] flex items-center justify-center shrink-0 mt-0.5">
                {p.icon}
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-[#0F294A] text-sm mb-0.5">{p.title}</h4>
                <p className="text-slate-600 font-medium leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-[#F0EBE3] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
};
