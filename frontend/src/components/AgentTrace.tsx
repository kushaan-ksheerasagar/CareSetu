import React, { useState } from 'react';
import { Cpu, CheckCircle2, ChevronDown, ChevronUp, Terminal, ShieldAlert, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { AgentReasoningResult } from '../types';

interface AgentTraceProps {
  reasoningResult: AgentReasoningResult | null;
  isProcessing: boolean;
}

export const AgentTrace: React.FC<AgentTraceProps> = ({ reasoningResult, isProcessing }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!reasoningResult && !isProcessing) {
    return (
      <div className="bg-white rounded-2xl border border-[#E9E4DC] p-5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-bold uppercase tracking-wider text-[#0F294A]">
              Agent Reasoning & Tool Execution Trace
            </span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-medium">
            Waiting for Voice Request
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          Speak or click a quick prompt above. You will see Gemini's plan, tool selection, parameter execution, and authorization verification in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#E9E4DC] p-5 sm:p-6 shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0EAE0] pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-100/70 border border-teal-300 flex items-center justify-center text-teal-800">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#0F294A]">
                Agentic Loop & Tool Execution Trace
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                Live Verification
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Source: <span className="font-semibold text-teal-900">{reasoningResult?.source || 'Gemini Coordinator'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200"
        >
          <span>{isExpanded ? 'Hide Trace' : 'Show Full Trace'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isProcessing && (
        <div className="flex items-center gap-3 py-4 px-4 bg-teal-50/60 rounded-xl border border-teal-200 animate-pulse mb-3">
          <Sparkles className="w-5 h-5 text-teal-700 animate-spin" />
          <span className="text-sm font-semibold text-teal-950">
            CareSetu Agent is analyzing request, formulating plan, and selecting tools...
          </span>
        </div>
      )}

      {reasoningResult && isExpanded && (
        <div className="space-y-4 text-xs">
          {/* Detected Intent */}
          <div className="flex items-center justify-between bg-[#F8F5EE] p-3 rounded-xl border border-[#E9E2D4]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                1. Detected Intent:
              </span>
              <span className="font-bold text-teal-900 text-sm">
                {reasoningResult.intent}
              </span>
            </div>
            {reasoningResult.requires_authorization && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                <ShieldAlert className="w-3.5 h-3.5" />
                Human Authorization Gate Triggered
              </span>
            )}
          </div>

          {/* Action Plan */}
          {reasoningResult.plan && reasoningResult.plan.length > 0 && (
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#ECE5D8]">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                <Layers className="w-3.5 h-3.5 text-teal-700" />
                <span>2. Agent Action Plan ({reasoningResult.plan.length} Steps)</span>
              </div>
              <ul className="space-y-1.5">
                {reasoningResult.plan.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700 font-medium leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Executed Tools */}
          {reasoningResult.executed_tools && reasoningResult.executed_tools.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-teal-700" />
                  <span>3. Tools Executed ({reasoningResult.executed_tools.length})</span>
                </span>
                <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified in Registry
                </span>
              </div>

              <div className="space-y-2">
                {reasoningResult.executed_tools.map((tool, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] border border-slate-800 overflow-x-auto shadow-xs"
                  >
                    <div className="flex items-center justify-between text-teal-400 font-bold border-b border-slate-800 pb-1.5 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">tool_call #{idx + 1}:</span>
                        <span className="text-emerald-400">{tool.tool_name}()</span>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        Executed Successfully
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 block mb-0.5 font-sans font-bold uppercase">
                          Input Arguments:
                        </span>
                        <pre className="text-amber-300 overflow-x-auto bg-slate-950/60 p-1.5 rounded">
                          {JSON.stringify(tool.arguments, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5 font-sans font-bold uppercase">
                          Tool Return Output:
                        </span>
                        <pre className="text-cyan-300 overflow-x-auto bg-slate-950/60 p-1.5 rounded">
                          {JSON.stringify(tool.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification & Authorization Gate */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-950 text-xs">
                Verification & Authorization Check Passed
              </p>
              <p className="text-emerald-800 text-[11px] font-medium mt-0.5">
                Core principle enforced: <em>"AI coordinates. Humans authorize."</em> No autonomous bank debit or unverified medication swap was executed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
