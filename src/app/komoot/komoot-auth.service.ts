import { Injectable, inject, signal } from '@angular/core';
import { TRAILROAM_REPOSITORIES } from '../storage/repositories/repositories.token';

export interface KomootAuthState {
  connected: boolean;
  userId: string;
  token: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class KomootAuthService {
  private readonly repositories = inject(TRAILROAM_REPOSITORIES);

  readonly connectionState = signal<KomootAuthState | null>(null);
  readonly isConnecting = signal(false);
  readonly connectionError = signal<string | null>(null);
  readonly isVerifying = signal(false);
  readonly authInvalid = signal(false);

  async loadAuthState(): Promise<void> {
    try {
      const settings = await this.repositories.settings.get();
      if (settings?.komootUserId && settings?.komootToken) {
        const candidate: KomootAuthState = {
          connected: false,
          userId: settings.komootUserId,
          token: settings.komootToken,
          displayName: settings.komootDisplayName ?? '',
        };
        this.connectionState.set(candidate);
        await this.verifyToken();
      } else {
        this.connectionState.set(null);
      }
    } catch {
      this.connectionState.set(null);
    }
  }

  async verifyToken(): Promise<boolean> {
    this.isVerifying.set(true);
    try {
      const state = this.connectionState();
      if (!state?.userId || !state?.token) { return false; }
      const response = await fetch(
        `https://api.komoot.de/v007/users/${state.userId}/tours/?page=0`,
        {
          headers: {
            Authorization: `Basic ${btoa(`${state.userId}:${state.token}`)}`,
          },
        },
      );
      if (response.ok) {
        this.connectionState.set({
          connected: true,
          userId: state.userId,
          token: state.token,
          displayName: state.displayName,
        });
        return true;
      }
      if (response.status === 401 || response.status === 403) {
        this.invalidateToken();
        return false;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.isVerifying.set(false);
    }
  }

  async connect(email: string, password: string): Promise<void> {
    this.isConnecting.set(true);
    this.connectionError.set(null);
    this.authInvalid.set(false);

    try {
      const response = await fetch(
        `https://api.komoot.de/v006/account/email/${encodeURIComponent(email)}/`,
        {
          headers: {
            Authorization: `Basic ${btoa(`${email}:${password}`)}`,
          },
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = (body as any)?.error ?? response.status === 403
          ? 'Access denied. Check your credentials.'
          : `Login failed (HTTP ${response.status}).`;
        this.connectionError.set(message);
        return;
      }

      const data = (await response.json()) as {
        username: string;
        password: string;
        user: { displayname: string };
      };

      const now = new Date().toISOString();
      const settings = (await this.repositories.settings.getOrCreateDefault()) as any;
      settings.komootUserId = data.username;
      settings.komootToken = data.password;
      settings.komootDisplayName = data.user.displayname;
      settings.komootLastVerifiedAt = now;
      settings.updatedAt = now;
      await this.repositories.settings.put(settings as any);

      this.connectionState.set({
        connected: true,
        userId: data.username,
        token: data.password,
        displayName: data.user.displayname,
      });
    } catch (err) {
      this.connectionError.set(
        err instanceof TypeError ? 'Network error. Check your connection.' : 'An unexpected error occurred.',
      );
    } finally {
      this.isConnecting.set(false);
    }
  }

  invalidateToken(): void {
    this.authInvalid.set(true);
    this.connectionState.set(null);
  }

  async disconnect(): Promise<void> {
    const settings = await this.repositories.settings.get();
    if (settings) {
      delete (settings as any).komootUserId;
      delete (settings as any).komootToken;
      delete (settings as any).komootDisplayName;
      delete (settings as any).komootLastVerifiedAt;
      settings.updatedAt = new Date().toISOString();
      await this.repositories.settings.put(settings as any);
    }
    this.connectionState.set(null);
  }

  getCredentials(): { userId: string; token: string } | null {
    const state = this.connectionState();
    if (!state?.userId || !state?.token) return null;
    return { userId: state.userId, token: state.token };
  }
}
