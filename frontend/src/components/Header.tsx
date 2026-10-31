import React from 'react';
import { ShieldCheck, Settings, RotateCcw, Heart, Mic, Radio } from 'lucide-react';
import { PatientProfile } from '../types';

interface HeaderProps {
  patient: PatientProfile;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onOpenPrivacy: () => void;
  onOpenSettings: () => void;
  onResetState: () => void;
  isBackendConnected: boolean;
  bolnaActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  patient,
  currentLanguage,
  onLanguageChange,
  onOpenPrivacy,
  onOpenSettings,
  onResetState,
  isBackendConnected,
  bolnaActive
}) => {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-[#E9E4DC] sticky top-0 z-40 px-4 md:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-700/20 text-white">
              <Heart className="w-7 h-7 fill-white/20 stroke-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-[#0F294A]">
                  CareSetu <span className="text-teal-700 font-normal text-lg">केयरसेतु</span>
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Voice-First Elder AI
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 tracking-wide">
                AI coordinates. Humans authorize.
              </p>
            </div>
          </div>

          {/* Mobile Quick Status */}
          <div className="md:hidden flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bolnaActive ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}`}>
              <Radio className="w-3 h-3 animate-pulse" />
              {bolnaActive ? 'Bolna' : 'Voice Demo'}
            </span>
          </div>
        </div>

        {/* Center Elder Badge */}
        <div className="hidden lg:flex items-center gap-2 bg-[#F7F4EE] px-4 py-1.5 rounded-full border border-[#E6E0D4] text-sm text-[#0F294A]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Assisting <strong>{patient.salutation} {patient.name}</strong> ({patient.age}y, {patient.city})</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end flex-wrap">
          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-[#FAF8F5] border-[#E2DDD3] text-slate-700">
            <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>{isBackendConnected ? 'FastAPI Connected' : 'Browser Agent Mode'}</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-teal-800">{bolnaActive ? 'Bolna SDK' : 'Web Speech Demo'}</span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center bg-[#F4EFE6] rounded-xl p-0.5 border border-[#E3DDD1]">
            {['English', 'ಕನ್ನಡ', 'हिन्दी'].map((lang) => {
              const active = currentLanguage.startsWith(lang.slice(0, 2)) || currentLanguage === lang;
              return (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>

          {/* Safety Principles Modal Trigger */}
          <button
            onClick={onOpenPrivacy}
            title="Privacy and Safety Principles"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 text-teal-800 hover:bg-teal-50 transition text-xs font-medium"
          >
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span className="hidden sm:inline">Safety</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            title="API Keys and Settings"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Reset Demo State Trigger */}
          <button
            onClick={onResetState}
            title="Reset to Fresh Demo State"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
