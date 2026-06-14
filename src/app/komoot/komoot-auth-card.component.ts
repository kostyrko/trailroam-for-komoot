import { Component, inject, signal } from '@angular/core';
import { KomootAuthService } from './komoot-auth.service';
import { ConfirmService } from '../shared/confirm.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-komoot-auth-card',
  host: { style: 'display: contents' },
  template: `
    <article class="action-card">
      <div class="action-card-top">
        <span class="action-card-label">KOMOOT ACCOUNT</span>
        <div class="action-card-icon action-card-icon-green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </div>
      <h3 class="action-card-title">Connect Komoot account</h3>
      @if (authService.authInvalid()) {
        <p class="auth-error banner" role="alert">Your Komoot connection has expired. Please reconnect.</p>
      }
      @if (authService.isVerifying()) {
        <p class="auth-verifying">Verifying connection…</p>
      }
      @if (authService.connectionState(); as state) {
        <p class="action-card-desc">Connected as <strong>{{ state.displayName }}</strong></p>
        <div class="action-card-bottom">
          <button class="btn btn-danger" type="button" (click)="disconnect()">Disconnect</button>
        </div>
      } @else if (!authService.isVerifying()) {
        <p class="action-card-desc">Enter your Komoot credentials to enable sync.</p>
        <div class="auth-form">
          <label class="auth-field">
            <span class="auth-label">Email</span>
            <input class="auth-input" type="email" [value]="email()" (input)="email.set($any($event.target).value)" placeholder="your@email.com" autocomplete="email" />
          </label>
          <label class="auth-field">
            <span class="auth-label">Password</span>
            <input class="auth-input" type="password" [value]="password()" (input)="password.set($any($event.target).value)" placeholder="Komoot password" autocomplete="current-password" />
          </label>
          @if (authService.connectionError(); as error) {
            <p class="auth-error" role="alert">{{ error }}</p>
          }
          <button class="btn btn-primary btn-block" type="button" [disabled]="!email() || !password() || authService.isConnecting()" (click)="connect()">
            {{ authService.isConnecting() ? 'Connecting...' : 'Connect' }}
          </button>
        </div>
      }
    </article>
  `,
  styles: [`
    .action-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; min-height: 180px; position: relative; }
    .action-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .action-card-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #0f766e; text-transform: uppercase; }
    .action-card-icon { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .action-card-icon-green { background: #e8f5ec; }
    .action-card-icon svg { color: #15803d; }
    .action-card-title { font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px; }
    .action-card-desc { font-size: 14px; color: #6b7280; line-height: 1.5; margin: 0; flex: 1; }
    .action-card-bottom { margin-top: 16px; }
    .auth-form { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
    .auth-field { display: flex; flex-direction: column; gap: 4px; }
    .auth-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: #6b7280; text-transform: uppercase; }
    .auth-input { background: #ffffff; border: 1px solid #dce6df; border-radius: 8px; color: #14211b; font: inherit; font-size: 0.875rem; min-height: 44px; padding: 0 12px; }
    .auth-input:focus { border-color: #1f6f50; box-shadow: 0 0 0 2px rgb(31 111 80 / 15%); outline: none; }
    .auth-error { color: #b8433a; font-size: 0.8125rem; margin: 0; }
    .auth-error.banner { background: #fdf0ee; border: 1px solid #e8c0bb; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
    .auth-verifying { color: #63746a; font-size: 0.8125rem; margin: 0 0 12px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 14px; font-weight: 600; height: 36px; padding: 0 16px; cursor: pointer; border: none; font-family: inherit; transition: background 0.15s; }
    .btn-primary { background: #15803d; color: #ffffff; }
    .btn-primary:hover { background: #166534; }
    .btn-danger { background: #ffffff; color: #dc2626; border: 1px solid #dc2626; }
    .btn-danger:hover { background: #fef2f2; }
    .btn-block { width: 100%; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class KomootAuthCardComponent {
  protected readonly authService = inject(KomootAuthService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);

  protected readonly email = signal('');
  protected readonly password = signal('');

  protected async connect(): Promise<void> {
    await this.authService.connect(this.email(), this.password());
    if (this.authService.connectionState()) {
      this.email.set('');
      this.password.set('');
      this.toastService.show('Connected to Komoot as ' + this.authService.connectionState()!.displayName);
    }
  }

  protected async disconnect(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Disconnect Komoot',
      message: 'This will remove your Komoot API token. You will need to reconnect to sync tours.',
      confirmLabel: 'Disconnect',
      danger: true,
    });
    if (!confirmed) return;
    await this.authService.disconnect();
    this.toastService.show('Disconnected from Komoot.');
  }
}
