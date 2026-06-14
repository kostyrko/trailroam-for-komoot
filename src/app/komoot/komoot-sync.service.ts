import { Injectable, inject, signal } from '@angular/core';
import { KomootApiService } from './komoot-api.service';
import { KomootTourNormalizer } from './komoot-tour-normalizer';
import { TRAILROAM_REPOSITORIES } from '../storage/repositories/repositories.token';
import { DataRefreshService } from '../shared/data-refresh.service';
import { ToastService } from '../shared/toast.service';
import { SyncHistoryService } from '../storage/sync-history.service';
import type { SyncNewResult } from '../storage/sync-summary.service';

@Injectable({ providedIn: 'root' })
export class KomootSyncService {
  private readonly api = inject(KomootApiService);
  private readonly normalizer = inject(KomootTourNormalizer);
  private readonly repositories = inject(TRAILROAM_REPOSITORIES);
  private readonly dataRefresh = inject(DataRefreshService);
  private readonly toastService = inject(ToastService);
  private readonly syncHistoryService = inject(SyncHistoryService);

  readonly isSyncing = signal(false);
  readonly syncProgress = signal<string | null>(null);

  async syncNewTours(): Promise<void> {
    if (this.isSyncing()) return;
    this.isSyncing.set(true);
    this.syncProgress.set('Fetching tour list…');

    try {
      const synced = await this.repositories.activities.list();
      const knownIds = synced.map((a) => a.providerActivityId);

      this.syncProgress.set('Fetching tours from Komoot…');
      console.log('[KomootSync] Fetching all tours, known IDs:', knownIds.length);
      const result = await this.api.fetchAllTours({ knownTourIds: knownIds });
      console.log('[KomootSync] fetchAllTours result:', result.tours.length, 'tours, stoppedEarly:', result.stoppedEarly);
      const allTours = result.tours;
      const tours = allTours.filter((t) => t.type === 'tour_recorded');
      const plannedCount = allTours.length - tours.length;
      if (plannedCount > 0) {
        console.log(`[KomootSync] Skipping ${plannedCount} planned tours (not yet supported)`);
      }

      if (tours.length === 0) {
        this.syncProgress.set(null);
        console.log('[KomootSync] No new recorded tours found');
        this.toastService.show('No new tours found.');
        await this.recordSync({ importedCount: 0, updatedCount: 0, routesSyncedCount: 0, skippedCount: 0, failedCount: 0, rateLimitedCount: 0 });
        return;
      }

      let importedCount = 0;
      let updatedCount = 0;
      let routesSynced = 0;
      let skippedCount = 0;
      let failedCount = 0;

      const CONCURRENCY = 3;
      for (let i = 0; i < tours.length; i += CONCURRENCY) {
        const batch = tours.slice(i, i + CONCURRENCY);
        this.syncProgress.set(`Processing ${Math.min(i + CONCURRENCY, tours.length)} of ${tours.length} tours…`);

        await Promise.all(batch.map(async (entry) => {
          try {
            const detailResult = await this.api.fetchTourDetail(entry.id);
            if (!detailResult.success) {
              if (detailResult.errorCode === 'NOT_FOUND') { skippedCount++; return; }
              failedCount++;
              return;
            }

            const { activity, route } = this.normalizer.normalize(entry, detailResult.data);

            const result = await this.repositories.activities.upsert(activity);
            if (result.inserted) importedCount++;
            else updatedCount++;

            if (route) {
              await this.repositories.activityRoutes.upsert(route);
              routesSynced++;
            } else {
              skippedCount++;
            }
          } catch {
            failedCount++;
          }
        }));
      }

      await this.recordSync({ importedCount, updatedCount, routesSyncedCount: routesSynced, skippedCount, failedCount, rateLimitedCount: 0 });
      this.toastService.show(`Synced ${importedCount} new tours${routesSynced > 0 ? `, ${routesSynced} with routes` : ''}.`);
      this.dataRefresh.emitRefresh();
    } finally {
      this.isSyncing.set(false);
      this.syncProgress.set(null);
    }
  }

  private async recordSync(result: SyncNewResult): Promise<void> {
    const now = new Date().toISOString();
    await this.repositories.syncState.put({
      id: 'default' as const,
      status: 'completed',
      completedAt: now,
      lastSuccessfulSyncAt: now,
      lastActivityFetchAt: now,
      importedCount: result.importedCount,
      updatedCount: result.updatedCount,
      routesSyncedCount: result.routesSyncedCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      rateLimitedCount: result.rateLimitedCount,
      startedAt: now,
    });
    await this.syncHistoryService.record('sync_new_activities', {
      importedCount: result.importedCount,
      updatedCount: result.updatedCount,
      routesSyncedCount: result.routesSyncedCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      rateLimitedCount: result.rateLimitedCount,
      status: 'completed',
    });
  }
}
