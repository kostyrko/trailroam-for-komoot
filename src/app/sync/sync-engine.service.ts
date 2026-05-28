import { Injectable, inject, signal } from '@angular/core';
import type { SyncStatus } from '../storage/storage.models';
import { TRAILROAM_REPOSITORIES } from '../storage/repositories/repositories.token';
import { StravaSessionService } from '../strava/strava-session.service';
import { StravaActivityNormalizer } from '../strava/strava-activity-normalizer';
import { RouteSyncService } from '../storage/route-sync.service';
import type { RouteSyncBatchItem } from '../storage/route-sync.service';

export interface SyncProgress {
  status: SyncStatus;
  phase: 'idle' | 'checking_session' | 'fetching_activities' | 'fetching_routes' | 'completed' | 'failed' | 'cancelled';
  fetchedActivities: number;
  totalActivities: number;
  syncedRoutes: number;
  totalRoutes: number;
  errorMessage?: string;
}

export interface SyncNewResult {
  importedCount: number;
  updatedCount: number;
  routesSyncedCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SyncEngineService {
  private readonly repositories = inject(TRAILROAM_REPOSITORIES);
  private readonly stravaSessionService = inject(StravaSessionService);
  private readonly activityNormalizer = inject(StravaActivityNormalizer);
  private readonly routeSyncService = inject(RouteSyncService);

  private cancelled = false;

  readonly progress = signal<SyncProgress>({
    status: 'idle',
    phase: 'idle',
    fetchedActivities: 0,
    totalActivities: 0,
    syncedRoutes: 0,
    totalRoutes: 0,
  });

  cancel(): void {
    this.cancelled = true;
  }

  async syncNewActivities(): Promise<SyncNewResult> {
    this.cancelled = false;

    const result: SyncNewResult = {
      importedCount: 0,
      updatedCount: 0,
      routesSyncedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };

    try {
      this.setProgress('checking_session');

      const sessionStatus = await this.stravaSessionService.checkSession();
      if (sessionStatus !== 'logged_in') {
        this.progress.set({ status: 'failed', phase: 'failed', fetchedActivities: 0, totalActivities: 0, syncedRoutes: 0, totalRoutes: 0, errorMessage: 'Please log in to Strava first.' });
        return { ...result, errorMessage: 'Strava login required' };
      }

      this.setProgress('fetching_activities');

      await this.repositories.syncState.put({
        id: 'default',
        status: 'fetching_activities',
        startedAt: new Date().toISOString(),
        importedCount: 0,
        updatedCount: 0,
        routesSyncedCount: 0,
        skippedCount: 0,
        failedCount: 0,
      });

      const allActivities = await this.fetchAllActivityPages();
      const knownIds = new Set<string>();

      const existingActivities = await this.repositories.activities.list();
      for (const a of existingActivities) {
        knownIds.add(a.id);
      }

      const normalizer = this.activityNormalizer;
      const now = new Date().toISOString();
      let imported = 0;
      let updated = 0;

      for (const raw of allActivities) {
        if (this.cancelled) {
          await this.saveSyncState(result, 'cancelled');
          return { ...result, errorMessage: 'Cancelled' };
        }

        const activity = normalizer.normalize(raw);
        const isNew = !knownIds.has(activity.id);

        if (isNew) {
          imported++;
          activity.importedAt = now;
          await this.repositories.activities.put(activity);
          knownIds.add(activity.id);
        } else {
          updated++;
          const existing = await this.repositories.activities.get(activity.id);
          if (existing) {
            activity.hasRoute = existing.hasRoute;
            activity.routeSyncStatus = existing.routeSyncStatus;
            activity.importedAt = existing.importedAt;
            await this.repositories.activities.put(activity);
          }
        }
      }

      result.importedCount = imported;
      result.updatedCount = updated;

      this.setProgress('fetching_routes');

      const activitiesNeedingRoutes = await this.repositories.activities.list();
      const routeItems: RouteSyncBatchItem[] = [];

      for (const a of activitiesNeedingRoutes) {
        if (a.routeSyncStatus === 'route_synced' || a.routeSyncStatus === 'fetching') {
          continue;
        }
        routeItems.push({
          activityId: a.id,
          providerActivityId: a.providerActivityId,
          fetchResult: { success: true, latlng: [] },
          skipReason: undefined,
        });
      }

      const totalRoutes = routeItems.length;
      this.progress.update((p) => ({ ...p, totalActivities: allActivities.length, totalRoutes }));

      let syncedRoutes = 0;
      let skipped = 0;
      let failed = 0;

      const CONCURRENCY = 3;
      for (let i = 0; i < routeItems.length; i += CONCURRENCY) {
        if (this.cancelled) {
          await this.saveSyncState(result, 'cancelled');
          return { ...result, errorMessage: 'Cancelled', skippedCount: skipped + (totalRoutes - i), failedCount: failed };
        }

        const batch = routeItems.slice(i, i + CONCURRENCY);

        const fetchedBatch = await Promise.all(
          batch.map(async (item) => {
            const fetchResult = await this.stravaSessionService.fetchActivityRoute(Number(item.providerActivityId));
            return { ...item, fetchResult };
          }),
        );

        const batchResult = await this.routeSyncService.syncRoutesBatch(fetchedBatch);
        syncedRoutes += batchResult.synced;
        skipped += batchResult.noRoute + batchResult.emptyRoute + batchResult.invalidCoordinates + batchResult.skipped;
        failed += batchResult.failed;

        this.progress.update((p) => ({ ...p, syncedRoutes: syncedRoutes + skipped + failed }));
      }

      result.routesSyncedCount = syncedRoutes;
      result.skippedCount = skipped;
      result.failedCount = failed;

      await this.saveSyncState(result, 'completed');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      result.errorMessage = message;
      result.failedCount += 1;
      await this.saveSyncState(result, 'failed');
      this.progress.set({ status: 'failed', phase: 'failed', fetchedActivities: 0, totalActivities: 0, syncedRoutes: 0, totalRoutes: 0, errorMessage: message });
      return result;
    }
  }

  private async fetchAllActivityPages(): Promise<any[]> {
    const all: any[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore && !this.cancelled) {
      const result = await this.stravaSessionService.fetchActivityList({ page, perPage });
      if (!result.success) {
        break;
      }
      all.push(...result.activities);
      this.progress.update((p) => ({ ...p, fetchedActivities: all.length }));
      hasMore = result.activities.length === perPage;
      page++;
    }

    return all;
  }

  private setProgress(phase: SyncProgress['phase']): void {
    this.progress.set({
      status: phase === 'completed' ? 'completed' : phase === 'failed' ? 'failed' : phase === 'cancelled' ? 'cancelled' : 'fetching_activities',
      phase,
      fetchedActivities: 0,
      totalActivities: 0,
      syncedRoutes: 0,
      totalRoutes: 0,
    });
  }

  private async saveSyncState(result: SyncNewResult, status: SyncStatus): Promise<void> {
    const now = new Date().toISOString();
    await this.repositories.syncState.put({
      id: 'default',
      status,
      completedAt: status === 'completed' || status === 'failed' || status === 'cancelled' ? now : undefined,
      lastSuccessfulSyncAt: status === 'completed' ? now : undefined,
      lastActivityFetchAt: now,
      importedCount: result.importedCount,
      updatedCount: result.updatedCount,
      routesSyncedCount: result.routesSyncedCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      startedAt: now,
      lastErrorCode: result.errorMessage ? 'SYNC_ERROR' : undefined,
      lastErrorMessage: result.errorMessage,
    });
  }
}
