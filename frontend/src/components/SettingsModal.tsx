import React, { useState, useEffect } from 'react';
import { Settings, Key, Radio, Save, X, ExternalLink, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiApiKey: string;
  onSaveGeminiApiKey: (key: string) => void;
  bolnaActive: boolean;
  onToggleBolnaActive: (active: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  geminiApiKey,
  onSaveGeminiApiKey,
  bolnaActive,
  onToggleBolnaActive
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [bolnaToggled, setBolnaToggled] = useState(bolnaActive);

  useEffect(() => {
    setApiKeyInput(geminiApiKey);
    setBolnaToggled(bolnaActive);
  }, [geminiApiKey, bolnaActive, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveGeminiApiKey(apiKeyInput.trim());
    onToggleBolnaActive(bolnaToggled);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E9E4DC] p-6 sm:p-8 max-w-lg w-full shadow-2xl text-[#0F294A]">
        <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">API Settings & Configuration</h2>
              <p className="text-xs text-slate-500 font-medium">Configure Gemini and Bolna AI integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-teal-700" />
                Google Gemini API Key (Optional)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-teal-700 hover:underline flex items-center gap-0.5 text-[11px] font-semibold"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy... (Leave empty to use built-in Agent Engine)"
              className="w-full bg-[#FAF8F5] border border-[#DDD5C7] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#0F294A] focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              If left blank, CareSetu uses its built-in deterministic coordinator with verified tool executions.
            </p>
          </div>

          {/* Bolna Voice Agent Mode */}
          <div className="bg-[#FAF8F5] border border-[#E9E2D4] p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#0F294A] flex items-center gap-1.5 text-sm">
                <Radio className="w-4 h-4 text-purple-700" />
                Bolna AI Web Call Integration
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                Official SDK
              </span>
            </div>
            <p className="text-slate-600 text-[11px] font-medium leading-relaxed mb-3">
              Uses <code>@bolna/web-call</code> with session minting proxy. When Bolna credentials (<code>BOLNA_API_KEY</code>, <code>BOLNA_AGENT_ID</code>) are active on backend, calls stream directly. Otherwise, runs in transparent Demo Voice Mode.
            </p>

            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-800">
              <input
                type="checkbox"
                checked={bolnaToggled}
                onChange={(e) => setBolnaToggled(e.target.checked)}
                className="w-4 h-4 rounded text-teal-700 focus:ring-teal-600"
              />
              <span>Prioritize Bolna Web Call SDK (or Fallback to Speech Demo)</span>
            </label>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Keys are stored locally in your browser storage and never transmitted to untrusted endpoints.</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#F0EBE3] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
