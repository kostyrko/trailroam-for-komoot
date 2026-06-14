import { TestBed } from '@angular/core/testing';
import { StravaActivityNormalizer } from './strava-activity-normalizer';
import type { StravaActivityResponse } from './strava-session.service';

describe('StravaActivityNormalizer', () => {
  let normalizer: StravaActivityNormalizer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    normalizer = TestBed.inject(StravaActivityNormalizer);
  });

  function createRaw(overrides: Partial<StravaActivityResponse> = {}): StravaActivityResponse {
    return {
      id: 100,
      name: 'Morning Ride',
      sport_type: 'Ride',
      start_date: '2025-01-01T08:00:00Z',
      start_date_local: '2025-01-01T09:00:00Z',
      distance: 42000,
      moving_time: 7200,
      elapsed_time: 7500,
      total_elevation_gain: 350,
      ...overrides,
    };
  }

  it('should create an ActivityRecord with correct id format', () => {
    const record = normalizer.normalize(createRaw({ id: 12345 }));

    expect(record.id).toBe('strava:12345');
    expect(record.provider).toBe('strava');
    expect(record.providerActivityId).toBe('12345');
  });

  it('should set the name from the raw response', () => {
    const record = normalizer.normalize(createRaw({ name: 'Afternoon Trail Run' }));

    expect(record.name).toBe('Afternoon Trail Run');
  });

  it('should map sport_type to correct category', () => {
    const record = normalizer.normalize(createRaw({ sport_type: 'TrailRun' }));

    expect(record.sportType).toBe('TrailRun');
    expect(record.activityCategory).toBe('run');
  });

  it('should fall back to deprecated type when sport_type is missing', () => {
    const record = normalizer.normalize(createRaw({ sport_type: undefined!, type: 'Hike' } as unknown as StravaActivityResponse));

    expect(record.sportType).toBe('Hike');
    expect(record.activityCategory).toBe('walk');
  });

  it('should default sport type to Unknown when both are missing', () => {
    const record = normalizer.normalize(createRaw({ sport_type: undefined!, type: undefined! } as unknown as StravaActivityResponse));

    expect(record.sportType).toBe('Unknown');
    expect(record.activityCategory).toBe('other');
  });

  it('should copy elevation gain', () => {
    const record = normalizer.normalize(createRaw({ total_elevation_gain: 350 }));

    expect(record.totalElevationGainMeters).toBe(350);
  });

  it('should copy average_speed and average_heartrate', () => {
    const record = normalizer.normalize(createRaw({ average_speed: 8.5, average_heartrate: 145 }));

    expect(record.averageSpeedMetersPerSecond).toBe(8.5);
    expect(record.averageHeartrateBpm).toBe(145);
  });

  it('should copy distance, moving_time, elapsed_time', () => {
    const record = normalizer.normalize(createRaw({
      distance: 15000,
      moving_time: 3600,
      elapsed_time: 4000,
    }));

    expect(record.distanceMeters).toBe(15000);
    expect(record.movingTimeSeconds).toBe(3600);
    expect(record.elapsedTimeSeconds).toBe(4000);
  });

  it('should set distanceMeters to 0 when distance is 0', () => {
    const record = normalizer.normalize(createRaw({ distance: 0 }));

    expect(record.distanceMeters).toBe(0);
  });

  it('should set movingTimeSeconds to 0 when moving_time is 0', () => {
    const record = normalizer.normalize(createRaw({ moving_time: 0 }));

    expect(record.movingTimeSeconds).toBe(0);
  });

  it('should set elapsedTimeSeconds to 0 when elapsed_time is 0', () => {
    const record = normalizer.normalize(createRaw({ elapsed_time: 0 }));

    expect(record.elapsedTimeSeconds).toBe(0);
  });

  it('should set startDate and startDateLocal', () => {
    const record = normalizer.normalize(createRaw({
      start_date: '2025-06-15T10:30:00Z',
      start_date_local: '2025-06-15T12:30:00Z',
    }));

    expect(record.startDate).toBe('2025-06-15T10:30:00Z');
    expect(record.startDateLocal).toBe('2025-06-15T12:30:00Z');
  });

  it('should set hasRoute to false initially', () => {
    const record = normalizer.normalize(createRaw());

    expect(record.hasRoute).toBe(false);
  });

  it('should set routeSyncStatus to not_attempted initially', () => {
    const record = normalizer.normalize(createRaw());

    expect(record.routeSyncStatus).toBe('not_attempted');
  });

  it('should build sourceUrl from providerActivityId', () => {
    const record = normalizer.normalize(createRaw({ id: 999 }));

    expect(record.sourceUrl).toBe('https://www.strava.com/activities/999');
  });

  it('should set importedAt and updatedAt to current ISO timestamp', () => {
    const before = Date.now() - 1000;
    const record = normalizer.normalize(createRaw());
    const after = Date.now() + 1000;

    const importedMs = new Date(record.importedAt).getTime();
    expect(importedMs).toBeGreaterThanOrEqual(before);
    expect(importedMs).toBeLessThanOrEqual(after);
    expect(record.updatedAt).toBe(record.importedAt);
  });

  it('should handle missing optional numeric fields gracefully', () => {
    const raw = createRaw();
    delete (raw as any).distance;
    delete (raw as any).moving_time;
    delete (raw as any).elapsed_time;

    const record = normalizer.normalize(raw);

    expect(record.distanceMeters).toBeUndefined();
    expect(record.movingTimeSeconds).toBeUndefined();
    expect(record.elapsedTimeSeconds).toBeUndefined();
  });
});
