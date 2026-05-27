import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  StravaSessionService,
  type SessionStatus,
} from './strava/strava-session.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly stravaSessionService = inject(StravaSessionService);

  protected readonly sessionStatus = signal<SessionStatus>('unknown_error');
  protected readonly isCheckingSession = signal(false);

  constructor() {
    this.checkSession();
  }

  protected checkSession(): void {
    this.isCheckingSession.set(true);
    this.stravaSessionService.checkSession().then((status) => {
      this.sessionStatus.set(status);
      this.isCheckingSession.set(false);
    });
  }

  protected get statusLabel(): string {
    const status = this.sessionStatus();
    switch (status) {
      case 'logged_in':
        return 'Ready';
      case 'login_required':
        return 'Login required';
      default:
        return 'Checking session…';
    }
  }

  protected get canSync(): boolean {
    return this.sessionStatus() === 'logged_in';
  }
}
