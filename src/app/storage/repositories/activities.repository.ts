import { TrailroamDatabase } from '../db';
import { ActivityRecord } from '../storage.models';

export interface UpsertActivityResult {
  inserted: boolean;
  activity: ActivityRecord;
}

export class ActivitiesRepository {
  constructor(private readonly db: TrailroamDatabase) {}

  async put(activity: ActivityRecord): Promise<string> {
    return this.db.activities.put(activity);
  }

  async get(id: string): Promise<ActivityRecord | undefined> {
    return this.db.activities.get(id);
  }

  async upsert(activity: ActivityRecord): Promise<UpsertActivityResult> {
    const existing = await this.get(activity.id);
    const inserted = existing === undefined;

    const merged: ActivityRecord = existing
      ? {
          ...activity,
          hasRoute: existing.hasRoute,
          routeSyncStatus: existing.routeSyncStatus,
          importedAt: existing.importedAt,
          updatedAt: new Date().toISOString(),
        }
      : activity;

    await this.put(merged);
    return { inserted, activity: merged };
  }

  async list(): Promise<ActivityRecord[]> {
    return this.db.activities.orderBy('startDate').reverse().toArray();
  }

  async clear(): Promise<void> {
    await this.db.activities.clear();
  }
}
