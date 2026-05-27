import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { TrailroamDatabase } from './db';
import { createRepositories } from './repositories';
import {
  AccessStateRecord,
  ActivityRecord,
  ActivityRouteRecord,
  DATABASE_SCHEMA_VERSION,
  DEFAULT_RECORD_ID,
  SettingsRecord,
  SyncStateRecord,
} from './storage.models';

describe('TrailroamDatabase', () => {
  let db: TrailroamDatabase;

  beforeEach(async () => {
    Dexie.dependencies.indexedDB = indexedDB;
    Dexie.dependencies.IDBKeyRange = IDBKeyRange;
    db = new TrailroamDatabase(`trailroam_test_${Date.now()}_${Math.random()}`);
    await db.open();
  });

  afterEach(async () => {
    db.close();
    await db.delete();
  });

  it('should initialize schema version 1 with initial tables', () => {
    expect(db.verno).toBe(DATABASE_SCHEMA_VERSION);
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'access_state',
      'activities',
      'activity_routes',
      'settings',
      'sync_state',
    ]);
  });

  it('should read and write records through repositories', async () => {
    const repositories = createRepositories(db);
    const now = new Date().toISOString();

    const activity: ActivityRecord = {
      id: 'strava:100',
      provider: 'strava',
      providerActivityId: '100',
      name: 'Morning Ride',
      sportType: 'Ride',
      activityCategory: 'ride',
      startDate: '2026-05-01T08:00:00.000Z',
      distanceMeters: 42000,
      movingTimeSeconds: 7200,
      hasRoute: true,
      routeSyncStatus: 'route_synced',
      importedAt: now,
      updatedAt: now,
    };

    const route: ActivityRouteRecord = {
      activityId: activity.id,
      providerActivityId: activity.providerActivityId,
      coordinates: [
        [19.94498, 50.06465],
        [19.9459, 50.0654],
      ],
      pointCount: 2,
      bounds: {
        west: 19.94498,
        south: 50.06465,
        east: 19.9459,
        north: 50.0654,
      },
      syncedAt: now,
      updatedAt: now,
    };

    const syncState: SyncStateRecord = {
      id: DEFAULT_RECORD_ID,
      status: 'idle',
      lastSuccessfulSyncAt: now,
    };

    const settings: SettingsRecord = {
      id: DEFAULT_RECORD_ID,
      mapProvider: 'openfreemap',
      createdAt: now,
      updatedAt: now,
    };

    const accessState: AccessStateRecord = {
      id: DEFAULT_RECORD_ID,
      status: 'beta_unrestricted',
      maxVisibleActivities: null,
      updatedAt: now,
    };

    await repositories.activities.put(activity);
    await repositories.activityRoutes.put(route);
    await repositories.syncState.put(syncState);
    await repositories.settings.put(settings);
    await repositories.accessState.put(accessState);

    await expect(repositories.activities.get(activity.id)).resolves.toEqual(activity);
    await expect(repositories.activities.list()).resolves.toEqual([activity]);
    await expect(repositories.activityRoutes.get(activity.id)).resolves.toEqual(route);
    await expect(repositories.activityRoutes.list()).resolves.toEqual([route]);
    await expect(repositories.syncState.get()).resolves.toEqual(syncState);
    await expect(repositories.settings.get()).resolves.toEqual(settings);
    await expect(repositories.accessState.get()).resolves.toEqual(accessState);
  });

  it('should create default OpenFreeMap settings without requiring a provider key', async () => {
    const repositories = createRepositories(db);
    const now = new Date('2026-05-26T10:00:00.000Z');

    const settings = await repositories.settings.getOrCreateDefault(now);

    expect(settings).toEqual({
      id: DEFAULT_RECORD_ID,
      mapProvider: 'openfreemap',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect('apiKey' in settings).toBe(false);
    await expect(repositories.settings.get()).resolves.toEqual(settings);
  });

  describe('activities upsert', () => {
    function createActivity(overrides: Partial<ActivityRecord> = {}): ActivityRecord {
      const now = new Date().toISOString();
      return {
        id: 'strava:100',
        provider: 'strava',
        providerActivityId: '100',
        name: 'Morning Ride',
        sportType: 'Ride',
        activityCategory: 'ride',
        startDate: '2026-05-01T08:00:00.000Z',
        distanceMeters: 42000,
        movingTimeSeconds: 7200,
        hasRoute: false,
        routeSyncStatus: 'not_attempted',
        importedAt: now,
        updatedAt: now,
        ...overrides,
      };
    }

    it('should insert a new record and return inserted: true', async () => {
      const repositories = createRepositories(db);
      const activity = createActivity();

      const result = await repositories.activities.upsert(activity);

      expect(result.inserted).toBe(true);
      expect(result.activity.id).toBe('strava:100');
    });

    it('should return inserted: false for an existing record', async () => {
      const repositories = createRepositories(db);
      const activity = createActivity();

      await repositories.activities.upsert(activity);
      const result = await repositories.activities.upsert(activity);

      expect(result.inserted).toBe(false);
    });

    it('should preserve hasRoute from the existing record when it was set to true', async () => {
      const repositories = createRepositories(db);
      const activity = createActivity({ hasRoute: true });

      await repositories.activities.upsert(activity);

      const updatedActivity = createActivity({ name: 'Updated Name', hasRoute: false });
      const result = await repositories.activities.upsert(updatedActivity);

      expect(result.activity.hasRoute).toBe(true);
    });

    it('should preserve routeSyncStatus from the existing record', async () => {
      const repositories = createRepositories(db);
      const activity = createActivity({ routeSyncStatus: 'route_synced' });

      await repositories.activities.upsert(activity);

      const updatedActivity = createActivity({ name: 'Updated Name', routeSyncStatus: 'not_attempted' });
      const result = await repositories.activities.upsert(updatedActivity);

      expect(result.activity.name).toBe('Updated Name');
      expect(result.activity.routeSyncStatus).toBe('route_synced');
    });

    it('should update updatedAt on existing records', async () => {
      const repositories = createRepositories(db);
      const activity = createActivity();

      await repositories.activities.upsert(activity);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedActivity = createActivity({ name: 'Updated Name' });
      const result = await repositories.activities.upsert(updatedActivity);

      expect(result.activity.updatedAt).not.toBe(activity.updatedAt);
      expect(new Date(result.activity.updatedAt).getTime()).toBeGreaterThan(
        new Date(activity.updatedAt).getTime(),
      );
    });

    it('should preserve importedAt from the existing record', async () => {
      const repositories = createRepositories(db);
      const activity = createActivity();

      await repositories.activities.upsert(activity);

      const updatedActivity = createActivity({ name: 'Updated Name' });
      const result = await repositories.activities.upsert(updatedActivity);

      expect(result.activity.importedAt).toBe(activity.importedAt);
    });

    it('should not duplicate records when upserting multiple times', async () => {
      const repositories = createRepositories(db);

      await repositories.activities.upsert(createActivity());
      await repositories.activities.upsert(createActivity({ name: 'Updated Name' }));
      await repositories.activities.upsert(createActivity({ name: 'Updated Again' }));

      const all = await repositories.activities.list();
      expect(all).toHaveLength(1);
    });

    it('should upsert multiple distinct activities without conflict', async () => {
      const repositories = createRepositories(db);

      const result1 = await repositories.activities.upsert(createActivity({ id: 'strava:1', providerActivityId: '1' }));
      const result2 = await repositories.activities.upsert(createActivity({ id: 'strava:2', providerActivityId: '2' }));

      expect(result1.inserted).toBe(true);
      expect(result2.inserted).toBe(true);
      expect(await repositories.activities.list()).toHaveLength(2);
    });
  });

  it('should keep existing settings after reopening the database', async () => {
    const databaseName = db.name;
    const repositories = createRepositories(db);
    const settings = await repositories.settings.getOrCreateDefault(
      new Date('2026-05-26T10:00:00.000Z'),
    );

    db.close();
    db = new TrailroamDatabase(databaseName);
    await db.open();

    await expect(
      createRepositories(db).settings.getOrCreateDefault(new Date('2026-05-26T11:00:00.000Z')),
    ).resolves.toEqual(settings);
  });
});
