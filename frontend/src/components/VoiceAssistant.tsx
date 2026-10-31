import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Send, Bot, User, Radio, ArrowRight } from 'lucide-react';
import { speechService } from '../services/speechService';
import { bolnaService } from '../services/bolnaWebCall';

interface VoiceAssistantProps {
  onProcessRequest: (message: string) => Promise<void>;
  isProcessing: boolean;
  currentLanguage: string;
  bolnaActive: boolean;
  lastResponse?: string;
  statusMessage?: string;
}

interface MessageEntry {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  onProcessRequest,
  isProcessing,
  currentLanguage,
  bolnaActive,
  lastResponse,
  statusMessage
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [messages, setMessages] = useState<MessageEntry[]>([
    {
      id: 'm1',
      sender: 'agent',
      text: 'Namaste Ramachandra ji. I am your CareSetu health coordinator. Tap the microphone and tell me what you need, or choose a quick option below.',
      timestamp: 'Just now'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    speechService.setLanguage(currentLanguage);
  }, [currentLanguage]);

  // When lastResponse changes, speak it using speechService if not using Bolna
  useEffect(() => {
    if (lastResponse && !bolnaActive) {
      setIsSpeaking(true);
      speechService.speak(
        lastResponse,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false)
      );
    }
  }, [lastResponse, bolnaActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript]);

  const [bolnaStatusNotice, setBolnaStatusNotice] = useState<string | null>(null);

  const fallbackToWebSpeech = () => {
    setIsListening(true);
    speechService.startListening(
      (transcript, isFinal) => {
        setCurrentTranscript(transcript);
        if (isFinal && transcript.trim()) {
          setIsListening(false);
          submitMessage(transcript.trim());
        }
      },
      (error) => {
        console.warn("Speech recognition notice:", error);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleStartListening = () => {
    if (isListening) {
      if (bolnaActive) {
        bolnaService.stopWebCall();
      }
      speechService.stopListening();
      setIsListening(false);
      return;
    }

    if (isSpeaking) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
    }

    setCurrentTranscript('');
    setBolnaStatusNotice(null);

    // If Bolna Live Web Call mode is enabled
    if (bolnaActive) {
      setIsListening(true);
      const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      bolnaService.startWebCall(
        `${API_BASE}/api/bolna-session`,
        {
          patient_name: "Ramachandra Rao",
          patient_age: 72,
          location: "Bengaluru, India"
        },
        {
          onStateChange: (st) => {
            if (st === 'active') {
              setIsListening(true);
            } else if (st === 'ended' || st === 'idle') {
              setIsListening(false);
            }
          },
          onError: (err) => {
            console.warn("Bolna Web Call status:", err);
            setBolnaStatusNotice(err || "Bolna credentials not active. Switched to transparent Demo Voice Mode.");
            fallbackToWebSpeech();
          },
          onCallEnd: () => {
            setIsListening(false);
          }
        }
      ).catch(() => {
        fallbackToWebSpeech();
      });
      return;
    }

    // Default High-Fidelity Demo Voice Mode (Web Speech API)
    fallbackToWebSpeech();
  };

  const submitMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: MessageEntry = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: time
    };

    setMessages((prev) => [...prev, userMsg]);
    setCurrentTranscript('');
    setTypedMessage('');

    try {
      await onProcessRequest(text.trim());
      // Append agent response when done
      if (lastResponse) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'agent',
            text: lastResponse,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sync latest response to conversation history
  useEffect(() => {
    if (lastResponse) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.sender === 'agent' && last.text === lastResponse) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'agent',
            text: lastResponse,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      });
    }
  }, [lastResponse]);

  const quickPrompts = [
    {
      title: "Same Medicine Refill",
      label: '"I need the same medicine I ordered last month."',
      icon: "💊",
      primary: true
    },
    {
      title: "Set Pill Reminder",
      label: '"Remind me to take my medicine after breakfast."',
      icon: "⏰"
    },
    {
      title: "Book Doctor",
      label: '"Book an appointment with my cardiologist Dr. Ananya."',
      icon: "🩺"
    },
    {
      title: "Alert Daughter",
      label: '"Tell my daughter Priya that I need a medicine refill."',
      icon: "📱"
    }
  ];

  return (
    <div className="bg-white rounded-3xl border border-[#E9E4DC] p-5 sm:p-7 shadow-sm transition-all hover:shadow-md">
      {/* Voice Assistant Header */}
      <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F294A] tracking-tight">
              Voice Healthcare Coordinator
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Natural voice interaction in English, ಕನ್ನಡ, or हिन्दी
            </p>
          </div>
        </div>

        {/* Live Audio / Call Mode Status */}
        <div className="flex items-center gap-2">
          {bolnaActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-200">
              <Radio className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
              Bolna AI Live Web Call
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
              Voice Demo Mode (Web Speech)
            </span>
          )}
        </div>
      </div>

      {/* Main Microphone Interaction Circle */}
      <div className="flex flex-col items-center justify-center py-6 sm:py-8 bg-[#FAF8F5] rounded-2xl border border-[#EFEAE1] mb-6">
        <div className="relative mb-4">
          {/* Animated rings when active */}
          {(isListening || isSpeaking || isProcessing) && (
            <>
              <div className="absolute -inset-4 rounded-full bg-teal-500/20 animate-ping"></div>
              <div className="absolute -inset-8 rounded-full bg-teal-500/10 animate-pulse"></div>
            </>
          )}

          <button
            onClick={handleStartListening}
            disabled={isProcessing}
            title={isListening ? "Tap to stop listening" : "Tap to speak with CareSetu"}
            className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-xl ${
              isListening
                ? 'bg-rose-600 text-white shadow-rose-600/40 animate-pulse'
                : isProcessing
                ? 'bg-amber-600 text-white shadow-amber-600/30'
                : isSpeaking
                ? 'bg-teal-700 text-white shadow-teal-700/40 ring-4 ring-teal-300'
                : 'bg-gradient-to-tr from-teal-700 to-teal-500 text-white hover:brightness-105 shadow-teal-700/30'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-9 h-9 sm:w-10 sm:h-10" />
                <span className="text-[11px] font-bold mt-1 uppercase tracking-wider">Listening</span>
              </>
            ) : isProcessing ? (
              <>
                <Sparkles className="w-9 h-9 sm:w-10 sm:h-10 animate-spin" />
                <span className="text-[11px] font-bold mt-1 uppercase tracking-wider">Thinking</span>
              </>
            ) : isSpeaking ? (
              <>
                <Volume2 className="w-9 h-9 sm:w-10 sm:h-10 animate-bounce" />
                <span className="text-[11px] font-bold mt-1 uppercase tracking-wider">Speaking</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 sm:w-11 sm:h-11" />
                <span className="text-[11px] font-bold mt-1 uppercase tracking-wider">Tap to Speak</span>
              </>
            )}
          </button>
        </div>

        {/* Visual Audio Waveform */}
        <div className="flex items-center gap-1.5 h-6 mb-2">
          {[4, 8, 14, 22, 16, 26, 12, 18, 10, 6].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-200 ${
                isListening || isSpeaking
                  ? 'bg-teal-600 voice-bar'
                  : 'bg-slate-300 h-2'
              }`}
              style={{
                height: isListening || isSpeaking ? `${h}px` : '4px',
                animationDelay: `${i * 0.12}s`
              }}
            />
          ))}
        </div>

        {/* State Label */}
        <p className="text-sm font-semibold text-[#0F294A]">
          {isListening
            ? "I am listening to you... speak naturally."
            : isProcessing
            ? statusMessage || "CareSetu is planning and selecting tools..."
            : isSpeaking
            ? "CareSetu is answering..."
            : "Tap the big microphone and speak in your comfortable pace."}
        </p>

        {/* Bolna Status Notice when fallback occurs */}
        {bolnaStatusNotice && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold text-center max-w-lg animate-fade-in">
            {bolnaStatusNotice}
          </div>
        )}

        {/* Live speech interim bubble */}
        {currentTranscript && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-teal-100 text-teal-950 text-sm font-medium border border-teal-300 max-w-lg text-center animate-fade-in">
            "{currentTranscript}"
          </div>
        )}
      </div>

      {/* Quick Voice Demonstration Prompts */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Voice Demonstration Prompts (Click to Test)
          </span>
          <span className="text-xs text-teal-700 font-semibold">
            One-touch elder accessible
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => submitMessage(q.label.replace(/"/g, ''))}
              disabled={isProcessing}
              className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all hover:translate-y-[-1px] ${
                q.primary
                  ? 'bg-teal-50/80 border-teal-300 hover:bg-teal-100/70 text-teal-950 ring-1 ring-teal-200'
                  : 'bg-white border-[#E9E4DC] hover:bg-[#FBF9F5] text-[#0F294A]'
              }`}
            >
              <span className="text-2xl mt-0.5">{q.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">
                    {q.title}
                  </span>
                  {q.primary && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-700 text-white">
                      Primary Workflow
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold mt-0.5 leading-snug">
                  {q.label}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 mt-2 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Transcript Conversation History Box */}
      <div className="border border-[#EFEAE1] rounded-2xl bg-[#FAF9F7] p-4">
        <div className="flex items-center justify-between border-b border-[#EBE5DB] pb-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Conversation Transcript
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Synchronized with Voice Agent
          </span>
        </div>

        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'agent' && (
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#0F294A] text-white rounded-br-xs'
                    : 'bg-white text-[#0F294A] border border-[#E5DFD5] rounded-bl-xs shadow-xs'
                }`}
              >
                <p className="font-medium">{m.text}</p>
                <span className={`text-[10px] block mt-1 ${m.sender === 'user' ? 'text-slate-300' : 'text-slate-400'}`}>
                  {m.timestamp}
                </span>
              </div>
              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Text alternative input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMessage(typedMessage);
          }}
          className="mt-3 flex items-center gap-2 pt-2 border-t border-[#EAE3D7]"
        >
          <input
            type="text"
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            disabled={isProcessing}
            placeholder="Or type your message here (e.g. 'I need the same medicine I ordered last month')..."
            className="flex-1 bg-white border border-[#DDD6C8] rounded-xl px-4 py-2.5 text-sm text-[#0F294A] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-600 font-medium"
          />
          <button
            type="submit"
            disabled={isProcessing || !typedMessage.trim()}
            className="px-4 py-2.5 bg-teal-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-teal-800 transition disabled:opacity-50 shadow-xs"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
