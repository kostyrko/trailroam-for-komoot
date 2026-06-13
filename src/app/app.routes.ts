import { Component, inject, signal } from '@angular/core';
import { Routes } from '@angular/router';
import { ActivitiesPageComponent } from './activities/activities-page.component';
import { MapPage } from './map/map-page.component';
import { ConfirmService } from './shared/confirm.service';
import { ToastService } from './shared/toast.service';
import { LocalDataService } from './storage/local-data.service';
import { SyncHistoryService } from './storage/sync-history.service';
import { KomootAuthService } from './komoot/komoot-auth.service';

@Component({
  selector: 'app-settings-page',
  styles: [`
    .settings-cards {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin: 16px 0;
    }

    @media (min-width: 800px) {
      .settings-cards {
        grid-template-columns: 1fr 1fr;
      }
    }

    .settings-card {
      margin: 0;
    }

    .auth-connected {
      margin: 0 0 12px;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .auth-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .auth-label {
      color: #63746a;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .auth-input {
      background: #ffffff;
      border: 1px solid #dce6df;
      border-radius: 8px;
      color: #14211b;
      font: inherit;
      font-size: 0.875rem;
      min-height: 44px;
      padding: 0 12px;
    }

    .auth-input:focus {
      border-color: #1f6f50;
      box-shadow: 0 0 0 2px rgb(31 111 80 / 15%);
      outline: none;
    }

    .auth-error {
      color: #b8433a;
      font-size: 0.8125rem;
      margin: 0;
    }
  `],
  template: `
    <section class="route-page" aria-labelledby="settings-title">
      <h1 id="settings-title">Settings</h1>
      <p>Manage local extension data stored in this browser.</p>

      <div class="settings-cards">
        <article class="empty-state settings-card" aria-labelledby="komoot-auth-title">
          <p class="empty-state-kicker">Komoot</p>
          <h2 id="komoot-auth-title">Connect Komoot account</h2>
          @if (komootAuth.connectionState(); as state) {
            <p class="auth-connected">Connected as <strong>{{ state.displayName }}</strong></p>
            <button class="danger-action" type="button" (click)="disconnectKomoot()">Disconnect</button>
          } @else {
            <p>Enter your Komoot email and password to obtain an API token. Your password is never stored.</p>
            <div class="auth-form">
              <label class="auth-field">
                <span class="auth-label">Email</span>
                <input class="auth-input" type="email" [value]="komootEmail()" (input)="komootEmail.set($any($event.target).value)" placeholder="your@email.com" autocomplete="email" />
              </label>
              <label class="auth-field">
                <span class="auth-label">Password</span>
                <input class="auth-input" type="password" [value]="komootPassword()" (input)="komootPassword.set($any($event.target).value)" placeholder="Komoot password" autocomplete="current-password" />
              </label>
              @if (komootAuth.connectionError(); as error) {
                <p class="auth-error" role="alert">{{ error }}</p>
              }
              <button class="primary-action" type="button" [disabled]="!komootEmail() || !komootPassword() || komootAuth.isConnecting()" (click)="connectKomoot()">
                {{ komootAuth.isConnecting() ? 'Connecting...' : 'Connect' }}
              </button>
            </div>
          }
        </article>

        <article class="empty-state settings-card" aria-labelledby="sync-data-title">
          <p class="empty-state-kicker">Sync</p>
          <h2 id="sync-data-title">Sync tours</h2>
          <p>Import new Komoot tours and their GPS routes.</p>
          <button class="primary-action" type="button" [disabled]="!komootAuth.connectionState()" (click)="syncNewActivities()">Sync tours</button>
        </article>

        <article class="empty-state settings-card" aria-labelledby="sync-routes-title">
          <p class="empty-state-kicker">Sync</p>
          <h2 id="sync-routes-title">Sync missing routes</h2>
          <p>Retry route import for activities that have no GPS route yet.</p>
          <button class="primary-action" type="button" (click)="syncMissingRoutes()">Sync missing routes</button>
        </article>

        <article class="empty-state danger-state settings-card" aria-labelledby="clear-resync-title">
          <p class="empty-state-kicker">Local data</p>
          <h2 id="clear-resync-title">Clear and re-sync</h2>
          <p>This deletes locally synced tours and route data, then imports them again from Komoot. Your settings will be kept.</p>
          <button
            class="danger-action"
            type="button"
            [disabled]="isClearingLocalData()"
            (click)="clearAndResync()"
          >
            {{ isClearingLocalData() ? 'Clearing...' : 'Clear and re-sync' }}
          </button>
        </article>

        <article class="empty-state danger-state settings-card" aria-labelledby="clear-local-data-title">
          <p class="empty-state-kicker">Local data</p>
          <h2 id="clear-local-data-title">Clear synced local data</h2>
          <p>
            This removes imported activities, routes, and sync state from this browser. Settings and access state are kept.
          </p>
          <button
            class="danger-action"
            type="button"
            [disabled]="isClearingLocalData()"
            (click)="clearSyncedLocalData()"
          >
            {{ isClearingLocalData() ? 'Clearing...' : 'Clear synced local data' }}
          </button>

          @if (clearLocalDataStatus()) {
            <p class="route-state" role="status">{{ clearLocalDataStatus() }}</p>
          }
        </article>

        <article class="empty-state settings-card" aria-labelledby="backup-title">
          <p class="empty-state-kicker">Local data</p>
          <h2 id="backup-title">Backup local data</h2>
          <p>Export your activities, routes, and settings to a JSON file. The backup file may contain GPS route history — store it somewhere private.</p>
          <button class="primary-action" type="button" (click)="backupLocalData()">Backup</button>
        </article>

        <article class="empty-state settings-card" aria-labelledby="restore-title">
          <p class="empty-state-kicker">Local data</p>
          <h2 id="restore-title">Restore local data</h2>
          <p>Restore your activities, routes, and settings from a previous backup file. This will replace your current local data.</p>
          <button class="primary-action" type="button" (click)="restoreLocalData()">Restore</button>
        </article>
      </div>

      <article class="empty-state" aria-labelledby="sync-history-title">
        <div class="history-header">
          <div>
            <p class="empty-state-kicker">History</p>
            <h2 id="sync-history-title">Sync history</h2>
          </div>
          @if (syncHistory().length > 0) {
            <button class="danger-action history-clear-btn" type="button" (click)="clearSyncHistory()">Clear sync history</button>
          }
        </div>
        @if (syncHistory().length === 0) {
          <p>No syncs have been performed yet.</p>
        } @else {
          <div class="sync-history-scroll">
            <table class="sync-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Trigger</th>
                  <th>Status</th>
                  <th>Activities</th>
                  <th>With routes</th>
                  <th>Without GPS</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of syncHistory(); track entry.id) {
                  <tr>
                    <td>{{ formatDate(entry.completedAt) }}</td>
                    <td class="trigger-cell">{{ formatTrigger(entry.trigger) }}</td>
                    <td>{{ entry.status }}</td>
                    <td>{{ entry.totalActivitiesAfter }}</td>
                    <td>{{ entry.activitiesWithRoutesAfter }}</td>
                    <td>{{ entry.activitiesWithoutRoutesAfter }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </article>

      <article class="empty-state" aria-labelledby="privacy-title">
        <p class="empty-state-kicker">Privacy &amp; Data</p>
        <h2 id="privacy-title">Where your data is stored</h2>
        <ul class="privacy-list">
          <li>Imported tours and GPS routes are stored only in this browser's IndexedDB using Dexie.js.</li>
          <li>No route or tour data is ever uploaded to Trailroam servers.</li>
          <li>Komoot login is required — enter your credentials in the Komoot auth section to obtain an API token.</li>
          <li>You can inspect stored data by opening DevTools (F12) → Application → IndexedDB → trailroam_for_komoot.</li>
        </ul>
      </article>
    </section>
  `,
})
export class SettingsPage {
  private readonly localDataService = inject(LocalDataService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);
  private readonly syncHistoryService = inject(SyncHistoryService);
  protected readonly komootAuth = inject(KomootAuthService);

  protected readonly isClearingLocalData = signal(false);
  protected readonly clearLocalDataStatus = signal<string | null>(null);
  protected readonly syncHistory = signal<import('./storage/storage.models').SyncHistoryRecord[]>([]);
  protected readonly komootEmail = signal('');
  protected readonly komootPassword = signal('');

  constructor() {
    this.loadSyncHistory();
    this.komootAuth.loadAuthState();
  }

  protected async connectKomoot(): Promise<void> {
    await this.komootAuth.connect(this.komootEmail(), this.komootPassword());
    if (this.komootAuth.connectionState()) {
      this.komootEmail.set('');
      this.komootPassword.set('');
      this.toastService.show('Connected to Komoot as ' + this.komootAuth.connectionState()!.displayName);
    }
  }

  protected async disconnectKomoot(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Disconnect Komoot',
      message: 'This will remove your Komoot API token. You will need to reconnect to sync tours.',
      confirmLabel: 'Disconnect',
      danger: true,
    });
    if (!confirmed) return;
    await this.komootAuth.disconnect();
    this.toastService.show('Disconnected from Komoot.');
  }

  private async loadSyncHistory(): Promise<void> {
    try {
      this.syncHistory.set(await this.syncHistoryService.list());
    } catch {}
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  protected syncNewActivities(): void {
    // TODO: implement Komoot sync
  }

  protected syncMissingRoutes(): void {
    // TODO: implement Komoot missing routes sync
  }

  protected async clearSyncHistory(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Clear sync history',
      message: 'This will delete all sync history entries. The imported activities and routes will not be affected.',
      confirmLabel: 'Clear history',
      danger: true,
    });
    if (!confirmed) { return; }
    await this.syncHistoryService.clear();
    this.syncHistory.set([]);
  }

  protected formatTrigger(trigger: string): string {
    switch (trigger) {
      case 'sync_new_activities': return 'Sync activities';
      case 'sync_missing_routes': return 'Sync missing routes';
      case 'clear_and_resync': return 'Clear and re-sync';
      case 'clear_synced_local_data': return 'Clear synced local data';
      case 'backup_local_data': return 'Backup local data';
      case 'restore_local_data': return 'Restore local data';
      default: return trigger;
    }
  }

  protected async restoreLocalData(): Promise<void> {
    const file = await this.pickBackupFile();
    if (!file) { return; }
    const json = await file.text();
    let backup: unknown;
    try {
      backup = JSON.parse(json);
    } catch {
      this.toastService.show('Invalid backup file: could not parse JSON.');
      return;
    }
    try {
      this.localDataService.validateBackup(backup);
    } catch (err) {
      this.toastService.show(err instanceof Error ? err.message : 'Invalid backup file.');
      return;
    }
    const confirmed = await this.confirmService.confirm({
      title: 'Restore backup',
      message: 'This will replace all current local data with the backup. Are you sure?',
      confirmLabel: 'Restore backup',
      danger: true,
    });
    if (!confirmed) { return; }
    const result = await this.localDataService.restore(backup as any);
    this.toastService.show(`Restored: ${result.settingsCount} settings, ${result.accessStateCount} access state, ${result.syncStateCount} sync state, ${result.activitiesCount} activities, ${result.activityRoutesCount} routes.`);
    await this.syncHistoryService.record('restore_local_data', {
      importedCount: 0, updatedCount: 0, routesSyncedCount: 0, skippedCount: 0, failedCount: 0, rateLimitedCount: 0, status: 'completed',
    });
    this.loadSyncHistory();
  }

  private pickBackupFile(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => {
        const file = input.files?.[0] ?? null;
        resolve(file);
      };
      input.click();
    });
  }

  protected async backupLocalData(): Promise<void> {
    const backup = await this.localDataService.backup();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trailroam-backup-${backup.exportedAt.slice(0, 19).replace(/[T:]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.show(`Backup: ${backup.settings.length} settings, ${backup.accessState.length} access state, ${backup.syncState.length} sync state, ${backup.activities.length} activities, ${backup.activityRoutes.length} routes.`);
    await this.syncHistoryService.record('backup_local_data', {
      importedCount: 0, updatedCount: 0, routesSyncedCount: 0, skippedCount: 0, failedCount: 0, rateLimitedCount: 0, status: 'completed',
    });
    this.loadSyncHistory();
  }

  protected async clearSyncedLocalData(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Clear synced local data',
      message: 'This will delete imported tours and routes from this browser. It will not delete anything from Komoot.',
      confirmLabel: 'Clear data',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.isClearingLocalData.set(true);
    this.clearLocalDataStatus.set(null);

    try {
      await this.localDataService.clearSyncedLocalData();
      await this.syncHistoryService.record('clear_synced_local_data', {
        importedCount: 0,
        updatedCount: 0,
        routesSyncedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        rateLimitedCount: 0,
        status: 'completed',
      });
      this.clearLocalDataStatus.set('Imported activities, routes, and sync state were cleared.');
      this.loadSyncHistory();
    } finally {
      this.isClearingLocalData.set(false);
    }
  }

  protected async clearAndResync(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Clear and re-sync',
      message: 'This will delete locally synced tours and route data, then import them again from Komoot. Your settings will be kept.',
      confirmLabel: 'Clear and re-sync',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.isClearingLocalData.set(true);
    this.clearLocalDataStatus.set(null);

    try {
      await this.localDataService.clearSyncedLocalData();
      await this.syncHistoryService.record('clear_and_resync', {
        importedCount: 0,
        updatedCount: 0,
        routesSyncedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        rateLimitedCount: 0,
        status: 'completed',
      });
      this.clearLocalDataStatus.set('Local data cleared. Ready to re-sync from Komoot.');
      // TODO: implement Komoot sync
    } finally {
      this.isClearingLocalData.set(false);
    }
  }
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'map',
  },
  {
    path: 'activities',
    component: ActivitiesPageComponent,
  },
  {
    path: 'map',
    component: MapPage,
  },
  {
    path: 'settings',
    component: SettingsPage,
  },
  {
    path: '**',
    redirectTo: 'map',
  },
];
