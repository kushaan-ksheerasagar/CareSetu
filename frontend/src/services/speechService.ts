/**
 * CareSetu Speech Service
 * Provides Speech-to-Text (Web Speech API) and Speech-to-Text Audio Feedback (SpeechSynthesis)
 * Tailored for Indian elderly users with clear, slightly slower pacing (0.9x) and respectful tone.
 * Supports English, Kannada (ಕನ್ನಡ), and Hindi (हिन्दी).
 */

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export type SpeakingListener = (isSpeaking: boolean) => void;
export type VoiceEnabledListener = (enabled: boolean) => void;

export class SpeechService {
  private recognition: any = null;
  private isListening: boolean = false;
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private currentLanguage: string = 'English';
  private voiceEnabled: boolean = true;
  private isSpeaking: boolean = false;
  private speakingListeners: Set<SpeakingListener> = new Set();
  private voiceEnabledListeners: Set<VoiceEnabledListener> = new Set();
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Initialize Voice Enabled preference (default: true for demo voice mode)
      const savedPref = localStorage.getItem('caresetu_voice_output_enabled');
      if (savedPref !== null) {
        this.voiceEnabled = savedPref === 'true';
      } else {
        this.voiceEnabled = true;
      }

      // 2. Initialize Speech Recognition
      const win = window as unknown as IWindow;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN';
      }

      // 3. Initialize Speech Synthesis
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  public getVoiceForLanguage(language: string): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    if (voices.length === 0) return null;

    const langLower = language.toLowerCase();
    const isKannada = langLower.includes('kannada') || langLower.startsWith('kn');
    const isHindi = langLower.includes('hindi') || langLower.startsWith('hi');

    if (isKannada) {
      const knVoice = voices.find(v => v.lang === 'kn-IN' || v.lang.startsWith('kn'));
      if (knVoice) return knVoice;
      // Fallback: Indian English or Hindi
      const inVoice = voices.find(v => v.lang.includes('IN') || v.name.toLowerCase().includes('india'));
      if (inVoice) return inVoice;
    }

    if (isHindi) {
      const hiVoice = voices.find(v => 
        v.lang === 'hi-IN' || 
        v.lang.startsWith('hi') || 
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('kalpana') ||
        v.name.toLowerCase().includes('hemant')
      );
      if (hiVoice) return hiVoice;
      const inVoice = voices.find(v => v.lang.includes('IN') || v.name.toLowerCase().includes('india'));
      if (inVoice) return inVoice;
    }

    // Default: English (Prefer Indian English voice, then general English)
    const indianVoice = voices.find(v => 
      v.lang === 'en-IN' || 
      v.lang === 'en_IN' || 
      v.name.toLowerCase().includes('india') ||
      v.name.toLowerCase().includes('heera') ||
      v.name.toLowerCase().includes('ravi') ||
      v.name.toLowerCase().includes('neerja') ||
      v.name.toLowerCase().includes('prabhat')
    );
    if (indianVoice) return indianVoice;

    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) return englishVoice;

    return voices[0] || null;
  }

  public setLanguage(langCode: string) {
    this.currentLanguage = langCode;
    if (this.recognition) {
      if (langCode.toLowerCase().includes('kannada') || langCode === 'kn') {
        this.recognition.lang = 'kn-IN';
      } else if (langCode.toLowerCase().includes('hindi') || langCode === 'hi') {
        this.recognition.lang = 'hi-IN';
      } else {
        this.recognition.lang = 'en-IN';
      }
    }
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Cleans text to make it elderly-friendly and purely conversational:
   * - Strips markdown, asterisks, JSON, technical tool traces, debug symbols
   * - Replaces ₹ currency symbol with spoken words
   * - Replaces medical/dosage abbreviations for clear acoustic comprehension
   */
  public sanitizeForSpeech(rawText: string, language: string = 'English'): string {
    if (!rawText) return '';

    let text = rawText;

    // Remove markdown code blocks and json blocks if any
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/\{[\s\S]*?\}/g, '');

    // Remove markdown links [title](url) -> title
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove markdown formatting: bold, italic, strikethrough, headers, bullet points
    text = text.replace(/[*_~`#>]+/g, ' ');

    // Remove system IDs like (PAT-72-BLR), (APPR-1234), etc.
    text = text.replace(/\([A-Z0-9\-_]{4,}\)/g, '');

    // Replace currency symbols for clear speech
    const langLower = language.toLowerCase();
    if (langLower.includes('kannada') || langLower.startsWith('kn')) {
      text = text.replace(/₹\s*(\d+(?:\.\d+)?)/g, '$1 ರೂಪಾಯಿ');
      text = text.replace(/Rs\.?\s*(\d+(?:\.\d+)?)/gi, '$1 ರೂಪಾಯಿ');
    } else if (langLower.includes('hindi') || langLower.startsWith('hi')) {
      text = text.replace(/₹\s*(\d+(?:\.\d+)?)/g, '$1 रुपये');
      text = text.replace(/Rs\.?\s*(\d+(?:\.\d+)?)/gi, '$1 रुपये');
    } else {
      text = text.replace(/₹\s*(\d+(?:\.\d+)?)/g, '$1 Rupees');
      text = text.replace(/Rs\.?\s*(\d+(?:\.\d+)?)/gi, '$1 Rupees');
    }

    // Expand common elderly prescription abbreviations for clear speech
    text = text.replace(/\b5\s*mg\b/gi, '5 milligrams');
    text = text.replace(/\b500\s*mg\b/gi, '500 milligrams');
    text = text.replace(/\b500\s*SR\b/gi, '500 S.R.');
    text = text.replace(/\b1\s*tab\b/gi, '1 tablet');
    text = text.replace(/\b1\s*cap\b/gi, '1 capsule');

    // Remove common emojis
    text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    // Clean multiple spaces and trim
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('caresetu_voice_output_enabled', enabled ? 'true' : 'false');
    }
    if (!enabled) {
      this.stopSpeaking();
    }
    this.voiceEnabledListeners.forEach(listener => listener(enabled));
  }

  public toggleVoiceEnabled(): boolean {
    const nextState = !this.voiceEnabled;
    this.setVoiceEnabled(nextState);
    return nextState;
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  public subscribeSpeaking(listener: SpeakingListener): () => void {
    this.speakingListeners.add(listener);
    listener(this.isSpeaking);
    return () => this.speakingListeners.delete(listener);
  }

  public subscribeVoiceEnabled(listener: VoiceEnabledListener): () => void {
    this.voiceEnabledListeners.add(listener);
    listener(this.voiceEnabled);
    return () => this.voiceEnabledListeners.delete(listener);
  }

  private setSpeakingState(speaking: boolean) {
    this.isSpeaking = speaking;
    this.speakingListeners.forEach(listener => listener(speaking));
  }

  /**
   * Speaks the response aloud via SpeechSynthesis.
   * Cancels any ongoing speech first to prevent overlapping audio.
   * Respects user's mute setting.
   */
  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: any) => void
  ): boolean {
    if (!this.synth) return false;

    // If muted by user, do not speak
    if (!this.voiceEnabled) {
      this.setSpeakingState(false);
      return false;
    }

    // Cancel any active or queued speech immediately
    this.stopSpeaking();

    const cleanText = this.sanitizeForSpeech(text, this.currentLanguage);
    if (!cleanText) return false;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = this.getVoiceForLanguage(this.currentLanguage);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        const langLower = this.currentLanguage.toLowerCase();
        if (langLower.includes('kannada') || langLower.startsWith('kn')) {
          utterance.lang = 'kn-IN';
        } else if (langLower.includes('hindi') || langLower.startsWith('hi')) {
          utterance.lang = 'hi-IN';
        } else {
          utterance.lang = 'en-IN';
        }
      }

      // Elderly pacing: 0.90 speed for clarity and comfort
      utterance.rate = 0.90;
      utterance.pitch = 1.0;

      this.currentUtterance = utterance;

      utterance.onstart = () => {
        this.setSpeakingState(true);
        if (onStart) onStart();
      };

      const handleDone = () => {
        this.currentUtterance = null;
        this.setSpeakingState(false);
        if (onEnd) onEnd();
      };

      utterance.onend = handleDone;
      utterance.onerror = (e) => {
        this.currentUtterance = null;
        this.setSpeakingState(false);
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn("SpeechSynthesis error:", e);
          if (onError) onError(e);
        }
      };

      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.warn("SpeechSynthesis speak exception:", err);
      this.setSpeakingState(false);
      return false;
    }
  }

  public stopSpeaking() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // ignore
      }
    }
    this.currentUtterance = null;
    this.setSpeakingState(false);
  }

  // --- Recognition methods ---
  public isRecognitionSupported(): boolean {
    return !!this.recognition;
  }

  public startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ) {
    // If speaking, stop speaking immediately so recognition doesn't hear itself!
    this.stopSpeaking();

    if (!this.recognition) {
      onError("Speech recognition is not supported in this browser. Please use Chrome/Edge or click a quick prompt.");
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        onResult(finalTranscript, true);
      } else if (interimTranscript) {
        onResult(interimTranscript, false);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError(event.error || "Speech recognition error");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn("Recognition start failed or already active", e);
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechService();
