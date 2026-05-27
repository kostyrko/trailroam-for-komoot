import { Injectable } from '@angular/core';
import type { ActivityRecord } from '../storage/storage.models';
import type { StravaActivityResponse } from './strava-session.service';
import { mapSportTypeToCategory } from './activity-category';

@Injectable({
  providedIn: 'root',
})
export class StravaActivityNormalizer {
  normalize(raw: StravaActivityResponse): ActivityRecord {
    const now = new Date().toISOString();
    const providerActivityId = String(raw.id);
    const id = `strava:${providerActivityId}`;
    const sportType = raw.sport_type ?? raw.type ?? 'Unknown';
    const startDate = raw.start_date;
    const startDateLocal = raw.start_date_local;

    return {
      id,
      provider: 'strava',
      providerActivityId,
      name: raw.name,
      sportType,
      activityCategory: mapSportTypeToCategory(sportType),
      startDate,
      startDateLocal,
      distanceMeters: raw.distance ?? undefined,
      movingTimeSeconds: raw.moving_time ?? undefined,
      elapsedTimeSeconds: raw.elapsed_time ?? undefined,
      hasRoute: false,
      routeSyncStatus: 'not_attempted',
      sourceUrl: `https://www.strava.com/activities/${providerActivityId}`,
      importedAt: now,
      updatedAt: now,
    };
  }
}
