import React, { useState } from 'react';
import { Users, Phone, MessageSquare, CheckCircle, XCircle, Bell, Shield, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { GuardianProfile, ApprovalRequest } from '../types';

interface GuardianSectionProps {
  guardian: GuardianProfile;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onToggleConsent: (enabled: boolean) => void;
}

export const GuardianSection: React.FC<GuardianSectionProps> = ({
  guardian,
  onApprove,
  onReject,
  onToggleConsent
}) => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'notifications'>('approvals');

  return (
    <div className="bg-white rounded-3xl border border-[#E9E4DC] p-5 sm:p-7 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F0EBE3] pb-4 mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#0F294A] tracking-tight">
                Family & Guardian Coordination
              </h2>
              {guardian.pending_approvals.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                  {guardian.pending_approvals.length} Action Needed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Consent-driven caregiver linkage • "Humans authorize"
            </p>
          </div>
        </div>

        {/* Consent Sharing Switch */}
        <div className="flex items-center gap-2 bg-[#FAF8F5] px-3 py-1.5 rounded-2xl border border-[#EBE3D6]">
          <Shield className="w-4 h-4 text-teal-700" />
          <span className="text-xs font-semibold text-slate-700">Elder Consent Sharing:</span>
          <button
            onClick={() => onToggleConsent(!guardian.consent_sharing)}
            className="flex items-center gap-1 text-xs font-bold transition text-teal-800"
          >
            {guardian.consent_sharing ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <ToggleRight className="w-6 h-6 fill-emerald-600 text-white" />
                Active
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <ToggleLeft className="w-6 h-6 text-slate-400" />
                Paused
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Guardian Card Profile */}
      <div className="bg-[#FAF8F5] border border-[#EFE8DC] rounded-2xl p-4 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
            PR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#0F294A]">
                {guardian.name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-semibold border border-purple-200">
                {guardian.relationship}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
              <span>{guardian.phone}</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                WhatsApp Verified
              </span>
            </p>
          </div>
        </div>

        {/* Quick Contact buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`tel:${guardian.phone}`}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span>Call</span>
          </a>
          <button
            onClick={() => setActiveTab('notifications')}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
            <span>Simulate WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#F0EBE3] pb-2 mb-4">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'approvals'
              ? 'bg-[#0F294A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Pending Approvals</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
            {guardian.pending_approvals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'notifications'
              ? 'bg-[#0F294A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Guardian Notifications & Alerts</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-mono">
            {guardian.notifications.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Pending Approvals Queue */}
      {activeTab === 'approvals' && (
        <div>
          {guardian.pending_approvals.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-dashed border-[#E5DFD4] rounded-2xl bg-[#FAF9F7]">
              <CheckCircle className="w-8 h-8 mx-auto text-emerald-500/70 mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                No pending authorization requests.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                When Ramachandra ji asks CareSetu for a medicine refill or doctor visit, requests needing authorization appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {guardian.pending_approvals.map((req: ApprovalRequest) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/40 text-[#0F294A] shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-bold uppercase">
                          Action Authorization Required
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {req.id}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-[#0F294A] mt-1">
                        {req.title}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {req.reason}
                      </p>
                    </div>

                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {req.created_at}
                    </span>
                  </div>

                  {/* Details preview */}
                  {req.details?.total_amount && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-xs mb-3 flex justify-between font-medium">
                      <span>Total Refill Amount:</span>
                      <span className="font-bold text-slate-900">₹{req.details.total_amount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Decision Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onApprove(req.id)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve as Priya (Guardian)</span>
                    </button>
                    <button
                      onClick={() => onReject(req.id)}
                      className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Guardian Notifications Feed */}
      {activeTab === 'notifications' && (
        <div className="space-y-2.5">
          {guardian.notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 transition ${
                notif.priority === 'high'
                  ? 'bg-rose-50/50 border-rose-200'
                  : 'bg-white border-[#E9E4DC]'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                notif.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-teal-50 text-teal-700'
              }`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#0F294A]">
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {notif.timestamp}
                  </span>
                </div>
                <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
