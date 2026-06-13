import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConfirmService } from './shared/confirm.service';
import { ToastComponent } from './shared/toast.component';
import { ToastService } from './shared/toast.service';
import { SyncSummaryService, type SyncSummary } from './storage/sync-summary.service';
import { SyncHistoryService, type SyncTrigger } from './storage/sync-history.service';
import { LocalDataService } from './storage/local-data.service';
import { TRAILROAM_REPOSITORIES } from './storage/repositories/repositories.token';
import { DataRefreshService } from './shared/data-refresh.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly syncSummaryService = inject(SyncSummaryService);
  private readonly localDataService = inject(LocalDataService);
  private readonly repositories = inject(TRAILROAM_REPOSITORIES);
  // TODO: inject KomootServices once implemented
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);
  private readonly dataRefresh = inject(DataRefreshService);
  private readonly syncHistoryService = inject(SyncHistoryService);

  private importHistoryRecorded = false;

  protected readonly syncSummary = signal<SyncSummary | null>(null);
  protected readonly syncMenuOpen = signal(false);
  protected readonly lastSyncLabel = signal<string | null>(null);
  protected readonly buildDate: string =
    document.documentElement.getAttribute('data-build') ?? 'dev';

  constructor() {
    this.loadSyncSummary();
    this.loadLastSyncLabel();
    this.listenForMessages();
    globalThis.addEventListener('click', () => this.closeSyncMenu());
  }

  private async loadLastSyncLabel(): Promise<void> {
    try {
      const syncState = await this.repositories.syncState.get();
      if (syncState?.lastSuccessfulSyncAt) {
        const date = new Date(syncState.lastSuccessfulSyncAt);
        const formatted = date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        this.lastSyncLabel.set(formatted);
      } else {
        this.lastSyncLabel.set(null);
      }
    } catch {
      this.lastSyncLabel.set(null);
    }
  }

  private listenForMessages(): void {
    const c = (globalThis as any).chrome;
    if (!c?.runtime?.onMessage) { return; }
    console.log('[Trailroam] Registering runtime message listener');
    c.runtime.onMessage.addListener((msg: any, _sender: any, sendResponse: any) => {
      console.log('[Trailroam] Runtime message received', msg?.type, msg?.payload ? '(has payload)' : '(no payload)');
      if (msg?.type === 'TRAILROAM_SYNC_DONE') {
        console.log('[Trailroam] Sync done notification received');
        this.loadSyncSummary();
        this.loadLastSyncLabel();
        this.toastService.show('Synced just now', 15000);
        return undefined;
      }
      if (msg?.type === 'TRAILROAM_GET_MISSING_ACTIVITIES') {
        this.sendMissingActivityIds(sendResponse);
        return true;
      }
      if (msg?.type === 'TRAILROAM_GET_SYNCED_IDS') {
        this.sendSyncedIds(sendResponse);
        return true;
      }
      if (msg?.type === 'TRAILROAM_STORE_ACTIVITIES') {
        console.log('[Trailroam] Store activities received — TODO: handle in Komoot');
      }
      return undefined;
    });
  }

  private async storeImportedData(payload: any): Promise<void> {
    // TODO: implement Komoot data storage
    console.log('[Trailroam] storeImportedData not yet implemented for Komoot');
  }

  private async sendSyncedIds(sendResponse: (response: any) => void): Promise<void> {
    const activities = await this.repositories.activities.list();
    const ids = new Set(activities.map((a) => a.providerActivityId));
    sendResponse({ syncedIds: [...ids] });
  }

  private async sendMissingActivityIds(sendResponse: (response: any) => void): Promise<void> {
    const activities = await this.repositories.activities.list();
    const needing = activities
      .filter((a) => a.routeSyncStatus !== 'route_synced')
      .map((a) => a.providerActivityId);
    sendResponse({ activityIds: needing });
  }

  protected toggleSyncMenu(): void {
    this.syncMenuOpen.update((v) => !v);
  }

  protected closeSyncMenu(): void {
    this.syncMenuOpen.set(false);
  }

  protected async dismissSyncSummary(): Promise<void> {
    this.syncSummary.set(null);
    const now = new Date().toISOString();
    const settings = await this.repositories.settings.getOrCreateDefault();
    settings.dismissedSyncAt = now;
    settings.updatedAt = now;
    await this.repositories.settings.put(settings);
  }

  private async showSyncResult(result: SyncNewResult): Promise<void> {
    await this.syncSummaryService.updateFromResult(result);
    const summary = await this.syncSummaryService.getSummary();
    this.syncSummary.set(summary);
  }

  protected syncNewActivities(): void {
    this.closeSyncMenu();
    // TODO: implement Komoot sync
  }

  protected syncMissingRoutes(): void {
    this.closeSyncMenu();
    // TODO: implement Komoot missing routes sync
  }

  protected async clearAndResync(): Promise<void> {
    this.closeSyncMenu();
    const confirmed = await this.confirmService.confirm({
      title: 'Clear and re-sync',
      message: 'This will delete locally synced tours and route data, then import them again from Komoot. Your settings will be kept.',
      confirmLabel: 'Clear and re-sync',
      danger: true,
    });
    if (!confirmed) { return; }
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
    this.syncNewActivities();
  }

  protected async clearSyncedLocalData(): Promise<void> {
    this.closeSyncMenu();
    const confirmed = await this.confirmService.confirm({
      title: 'Clear synced local data',
      message: 'This will delete imported tours and routes from this browser. It will not delete anything from Komoot.',
      confirmLabel: 'Clear data',
      danger: true,
    });
    if (!confirmed) { return; }
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
  }

  protected async backupLocalData(): Promise<void> {
    this.closeSyncMenu();
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
  }

  protected async restoreLocalData(): Promise<void> {
    this.closeSyncMenu();
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

  protected refreshExtension(): void {
    window.location.href = 'index.html';
  }

  private async loadSyncSummary(): Promise<void> {
    try {
      const summary = await this.syncSummaryService.getSummary();
      if (!summary.hasResults) {
        this.syncSummary.set(null);
        return;
      }
      const settings = await this.repositories.settings.get();
      if (settings?.dismissedSyncAt && summary.lastSuccessfulSyncAt && settings.dismissedSyncAt >= summary.lastSuccessfulSyncAt) {
        this.syncSummary.set(null);
        return;
      }
      this.syncSummary.set(summary);
    } catch {
    }
  }
}
