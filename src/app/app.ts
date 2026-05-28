import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  StravaSessionService,
  type SessionStatus,
} from './strava/strava-session.service';
import { SyncSummaryService, type SyncSummary } from './storage/sync-summary.service';
import { LocalDataService } from './storage/local-data.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly stravaSessionService = inject(StravaSessionService);
  private readonly syncSummaryService = inject(SyncSummaryService);
  private readonly localDataService = inject(LocalDataService);

  protected readonly sessionStatus = signal<SessionStatus>('unknown_error');
  protected readonly isCheckingSession = signal(false);
  protected readonly syncSummary = signal<SyncSummary | null>(null);
  protected readonly syncMenuOpen = signal(false);

  constructor() {
    this.checkSession();
    this.loadSyncSummary();
  }

  protected checkSession(): void {
    this.isCheckingSession.set(true);
    this.stravaSessionService.checkSession()
      .then((status) => {
        this.sessionStatus.set(status);
      })
      .catch(() => {
        this.sessionStatus.set('unknown_error');
      })
      .finally(() => {
        this.isCheckingSession.set(false);
      });
  }

  protected toggleSyncMenu(): void {
    this.syncMenuOpen.update((v) => !v);
  }

  protected closeSyncMenu(): void {
    this.syncMenuOpen.set(false);
  }

  protected dismissSyncSummary(): void {
    this.syncSummary.set(null);
  }

  protected get statusLabel(): string {
    const status = this.sessionStatus();
    switch (status) {
      case 'logged_in':
        return 'Ready';
      case 'login_required':
        return 'Login required';
      case 'unknown_error':
        return 'Connection error';
      default:
        return 'Unknown';
    }
  }

  protected get canSync(): boolean {
    return this.sessionStatus() === 'logged_in';
  }

  protected syncNewActivities(): void {
    this.closeSyncMenu();
  }

  protected syncMissingRoutes(): void {
    this.closeSyncMenu();
  }

  protected async clearAndResync(): Promise<void> {
    this.closeSyncMenu();
    const confirmed = window.confirm(
      'This will delete locally synced activities and route data, then import them again from Strava. Your settings will be kept.',
    );
    if (!confirmed) { return; }
    await this.localDataService.clearSyncedLocalData();
  }

  protected async clearSyncedLocalData(): Promise<void> {
    this.closeSyncMenu();
    const confirmed = window.confirm(
      'This will delete imported activities and routes from this browser. It will not delete anything from Strava.',
    );
    if (!confirmed) { return; }
    await this.localDataService.clearSyncedLocalData();
  }

  protected backupLocalData(): void {
    this.closeSyncMenu();
  }

  protected restoreLocalData(): void {
    this.closeSyncMenu();
  }

  private async loadSyncSummary(): Promise<void> {
    try {
      const summary = await this.syncSummaryService.getSummary();
      this.syncSummary.set(summary.hasResults ? summary : null);
    } catch {
    }
  }
}
