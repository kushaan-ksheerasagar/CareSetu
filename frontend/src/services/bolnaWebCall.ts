/**
 * Bolna AI Web Call Integration for CareSetu
 * Uses @bolna/web-call official SDK:
 * https://docs.bolna.ai/api-reference/introduction
 * 
 * Safely requests session credentials via backend proxy (/api/bolna-session)
 * and falls back to transparent Demo Voice Mode when credentials are not configured.
 */

import { BolnaWebCall } from '@bolna/web-call';

export type BolnaCallState = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

export interface BolnaCallListeners {
  onStateChange: (state: BolnaCallState) => void;
  onError: (error: string) => void;
  onCallEnd: () => void;
}

export class BolnaService {
  private callInstance: any = null;
  private currentState: BolnaCallState = 'idle';

  public async startWebCall(
    sessionUrlOrEndpoint: string = '/api/bolna-session',
    userData: Record<string, any> = {},
    listeners: BolnaCallListeners
  ): Promise<boolean> {
    try {
      listeners.onStateChange('connecting');

      // Check if backend session creation is supported
      const response = await fetch(sessionUrlOrEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_data: userData })
      });

      if (!response.ok) {
        throw new Error(`Session proxy failed with status ${response.status}`);
      }

      const sessionResult = await response.json();

      // Transparent demo mode fallback if Bolna credentials are not set on server
      if (sessionResult.demo_mode) {
        listeners.onError(sessionResult.message || "Bolna credentials not active. Use transparent Demo Voice Mode.");
        listeners.onStateChange('idle');
        return false;
      }

      // Initialize official Bolna SDK
      this.callInstance = new BolnaWebCall({
        sessionUrl: sessionUrlOrEndpoint,
        userData
      });

      this.callInstance.on('state-change', (state: string) => {
        const mappedState: BolnaCallState =
          state === 'active' ? 'active' :
          state === 'connecting' ? 'connecting' :
          state === 'ended' ? 'ended' : 'idle';
        this.currentState = mappedState;
        listeners.onStateChange(mappedState);
      });

      this.callInstance.on('call-end', () => {
        this.currentState = 'ended';
        listeners.onCallEnd();
        listeners.onStateChange('idle');
      });

      this.callInstance.on('error', (err: any) => {
        console.error("Bolna SDK Error:", err);
        listeners.onError(err?.message || "Bolna Web Call error encountered");
        listeners.onStateChange('error');
      });

      await this.callInstance.start();
      return true;
    } catch (err: any) {
      console.warn("Could not initiate Bolna Web Call:", err);
      listeners.onError(err.message || "Bolna Web Call failed to initialize.");
      listeners.onStateChange('idle');
      return false;
    }
  }

  public stopWebCall() {
    if (this.callInstance) {
      try {
        this.callInstance.stop();
      } catch (e) {
        console.warn("Bolna stop call error:", e);
      }
      this.callInstance = null;
    }
    this.currentState = 'idle';
  }

  public getState(): BolnaCallState {
    return this.currentState;
  }
}

export const bolnaService = new BolnaService();
