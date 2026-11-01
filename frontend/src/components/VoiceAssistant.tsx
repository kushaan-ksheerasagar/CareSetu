import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Square,
  Sparkles,
  Send,
  Bot,
  User,
  Radio,
  ArrowRight
} from 'lucide-react';
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
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => speechService.isVoiceEnabled());
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [bolnaStatusNotice, setBolnaStatusNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageEntry[]>([
    {
      id: 'm1',
      sender: 'agent',
      text: 'Namaste Ramachandra ji. I am your CareSetu health coordinator. Tap the microphone and tell me what you need, or choose a quick option below.',
      timestamp: 'Just now'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to speechService real-time events
  useEffect(() => {
    const unsubSpeaking = speechService.subscribeSpeaking(setIsSpeaking);
    const unsubVoice = speechService.subscribeVoiceEnabled(setIsVoiceEnabled);
    return () => {
      unsubSpeaking();
      unsubVoice();
    };
  }, []);

  // Update speechService language when selected
  useEffect(() => {
    speechService.setLanguage(currentLanguage);
  }, [currentLanguage]);

  // When lastResponse changes, speak it aloud in Demo Voice Mode (unless Bolna Web Call is active)
  useEffect(() => {
    if (lastResponse && !bolnaActive && isVoiceEnabled) {
      speechService.speak(lastResponse);
    }
  }, [lastResponse, bolnaActive, isVoiceEnabled]);

  // If Bolna Live Web Call becomes active, ensure browser speech synthesis is silenced
  useEffect(() => {
    if (bolnaActive) {
      speechService.stopSpeaking();
    }
  }, [bolnaActive]);

  // Auto-scroll conversation transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript]);

  // Sync latest agent response into messages list
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

  const fallbackToWebSpeech = () => {
    // Silence any speech before listening
    speechService.stopSpeaking();
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
    // Stop any ongoing speech immediately
    speechService.stopSpeaking();

    if (isListening) {
      if (bolnaActive) {
        bolnaService.stopWebCall();
      }
      speechService.stopListening();
      setIsListening(false);
      return;
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

    // Default Demo Voice Mode (Web Speech API)
    fallbackToWebSpeech();
  };

  const submitMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    // Immediately stop any active speech when a new user request is submitted
    speechService.stopSpeaking();

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
    } catch (err) {
      console.error(err);
    }
  };

  // Voice Control Actions
  const handleToggleMute = () => {
    speechService.toggleVoiceEnabled();
  };

  const handleStopSpeaking = () => {
    speechService.stopSpeaking();
  };

  const handleReplayLatest = () => {
    const agentMsgs = messages.filter((m) => m.sender === 'agent');
    const latestText = agentMsgs[agentMsgs.length - 1]?.text || lastResponse;
    if (latestText) {
      if (!isVoiceEnabled) {
        // If muted, automatically re-enable voice so user hears their replay
        speechService.setVoiceEnabled(true);
      }
      speechService.speak(latestText);
    }
  };

  const handleReplayMessage = (text: string) => {
    if (!isVoiceEnabled) {
      speechService.setVoiceEnabled(true);
    }
    speechService.speak(text);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F0EBE3] pb-4 mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F294A] tracking-tight">
              Voice Healthcare Coordinator
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Spoken voice interaction in English, ಕನ್ನಡ, or हिन्दी
            </p>
          </div>
        </div>

        {/* Live Audio / Call Mode Status & Voice Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Mode Pill */}
          {bolnaActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-200">
              <Radio className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
              Bolna AI Live Web Call
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
              Demo Voice Mode (Web Speech)
            </span>
          )}

          {/* Speaker / Mute Toggle Button */}
          <button
            onClick={handleToggleMute}
            type="button"
            title={
              isVoiceEnabled
                ? "Spoken AI voice enabled. Click to mute audio responses."
                : "Spoken AI voice is muted. Click to enable audio responses."
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shadow-xs border ${
              isVoiceEnabled
                ? isSpeaking
                  ? 'bg-teal-700 text-white border-teal-800 ring-2 ring-teal-400 animate-pulse'
                  : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {isVoiceEnabled ? (
              <>
                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce text-white' : 'text-teal-700'}`} />
                <span>Voice: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Voice: Muted</span>
              </>
            )}
          </button>

          {/* Replay Latest Response Button */}
          <button
            onClick={handleReplayLatest}
            type="button"
            disabled={isProcessing || isListening}
            title="Replay CareSetu's latest response aloud"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-[#DDD6C8] text-[#0F294A] hover:bg-[#FAF8F5] transition disabled:opacity-40 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
            <span>Replay</span>
          </button>
        </div>
      </div>

      {/* Main Microphone Interaction Circle */}
      <div className="flex flex-col items-center justify-center py-6 sm:py-8 bg-[#FAF8F5] rounded-2xl border border-[#EFEAE1] mb-6 relative">
        {/* Active Speaking Indicator Banner */}
        {isSpeaking && (
          <div className="w-full max-w-md mx-auto mb-4 px-4 py-2 rounded-2xl bg-teal-100 border border-teal-300 text-teal-950 flex items-center justify-between text-xs sm:text-sm font-semibold shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-teal-800 animate-bounce" />
              <span>CareSetu is speaking aloud...</span>
            </div>
            <button
              onClick={handleStopSpeaking}
              type="button"
              className="px-2.5 py-1 bg-white border border-teal-300 text-teal-900 font-bold rounded-lg hover:bg-teal-50 transition shadow-xs text-xs flex items-center gap-1"
            >
              <Square className="w-3 h-3 fill-teal-900" />
              <span>Stop Speech</span>
            </button>
          </div>
        )}

        <div className="relative mb-4">
          {/* Animated rings when active */}
          {(isListening || isSpeaking || isProcessing) && (
            <>
              <div className="absolute -inset-4 rounded-full bg-teal-500/20 animate-ping pointer-events-none"></div>
              <div className="absolute -inset-8 rounded-full bg-teal-500/10 animate-pulse pointer-events-none"></div>
            </>
          )}

          <button
            onClick={handleStartListening}
            disabled={isProcessing}
            type="button"
            title={
              isListening
                ? "Tap to stop listening"
                : isSpeaking
                ? "Tap to stop CareSetu from speaking"
                : "Tap to speak with CareSetu"
            }
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
                isListening || isSpeaking ? 'bg-teal-600 voice-bar' : 'bg-slate-300 h-2'
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
            ? "CareSetu is speaking aloud... (Click mic or Stop to silence)"
            : isVoiceEnabled
            ? "Tap the big microphone and speak. Spoken audio response is enabled."
            : "Tap the big microphone and speak. (Spoken audio is muted)"}
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
              type="button"
              onClick={() => {
                speechService.stopSpeaking();
                submitMessage(q.label.replace(/"/g, ''));
              }}
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Conversation Transcript
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold">
              Live Text & Audio
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Tap speaker to re-listen
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
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/60">
                  <span
                    className={`text-[10px] block ${
                      m.sender === 'user' ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                  {m.sender === 'agent' && (
                    <button
                      onClick={() => handleReplayMessage(m.text)}
                      type="button"
                      title="Listen to this message aloud"
                      className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-900 font-semibold px-1.5 py-0.5 rounded-md hover:bg-teal-50 transition"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Speak</span>
                    </button>
                  )}
                </div>
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
