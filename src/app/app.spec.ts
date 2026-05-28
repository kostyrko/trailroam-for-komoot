import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { ActivitiesPageComponent } from './activities/activities-page.component';
import { MapPage } from './map/map-page.component';
import { SettingsPage, routes } from './app.routes';
import { MapLibreService } from './map/maplibre.service';
import { RouteRendererService } from './map/route-renderer.service';
import { LocalDataService } from './storage/local-data.service';
import { TRAILROAM_REPOSITORIES } from './storage/repositories/repositories.token';
import { StravaSessionService, type SessionStatus } from './strava/strava-session.service';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('App', () => {
  function configureApp(
    checkSession: () => Promise<SessionStatus>,
    syncStateGet: () => any = () => undefined,
  ): void {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: StravaSessionService,
          useValue: { checkSession },
        },
        {
          provide: TRAILROAM_REPOSITORIES,
          useValue: {
            activities: { put: vi.fn(), get: vi.fn(), list: vi.fn(), clear: vi.fn(), upsert: vi.fn() },
            activityRoutes: { put: vi.fn(), get: vi.fn(), list: vi.fn(), clear: vi.fn() },
            syncState: { put: vi.fn(), get: vi.fn().mockImplementation(syncStateGet), clear: vi.fn() },
            settings: { put: vi.fn(), get: vi.fn(), clear: vi.fn(), getOrCreateDefault: vi.fn() },
            accessState: { put: vi.fn(), get: vi.fn(), clear: vi.fn(), getOrCreateDefault: vi.fn() },
          },
        },
      ],
    });
  }

  it('should create the app', () => {
    configureApp(() => Promise.resolve('logged_in'));
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render primary navigation', async () => {
    configureApp(() => Promise.resolve('logged_in'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = [...compiled.querySelectorAll('nav a')].map((link) => link.textContent?.trim());
    expect(links).toEqual(['Activities', 'Map', 'Settings']);
  });

  it('should render header sync action slot', async () => {
    configureApp(() => Promise.resolve('logged_in'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const syncButton = compiled.querySelector<HTMLButtonElement>('.sync-menu-trigger');

    expect(compiled.querySelector('.brand')?.textContent).toContain('Trailroam for Strava');
    expect(compiled.querySelector('.header-actions')).toBeTruthy();
    expect(syncButton?.textContent).toContain('Sync');
    expect(syncButton?.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('should show Ready status when session is logged in', async () => {
    configureApp(() => Promise.resolve('logged_in'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sync-status')?.textContent).toContain('Ready');
    expect(compiled.querySelector('.session-alert')).toBeFalsy();
  });

  it('should show login-required banner when session check returns login_required', async () => {
    configureApp(() => Promise.resolve('login_required'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sync-status')?.textContent).toContain('Login required');
    expect(compiled.querySelector('.session-alert')).toBeTruthy();
    expect(compiled.querySelector('.session-alert')?.textContent).toContain('Please log in to Strava first.');
    expect(compiled.querySelector('.session-alert')?.textContent).toContain('Open Strava');
    expect(compiled.querySelector('.session-alert')?.textContent).toContain('Retry');
  });

  it('should disable sync button when session is not logged in', async () => {
    configureApp(() => Promise.resolve('login_required'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();

    const syncButton = fixture.nativeElement.querySelector('.sync-menu-trigger') as HTMLButtonElement;
    expect(syncButton?.disabled).toBe(true);
  });

  it('should enable sync button when session is logged in', async () => {
    configureApp(() => Promise.resolve('logged_in'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();

    const syncButton = fixture.nativeElement.querySelector('.sync-menu-trigger') as HTMLButtonElement;
    expect(syncButton?.disabled).toBe(false);
  });

  it('should show Connection error banner when session check returns unknown_error', async () => {
    configureApp(() => Promise.resolve('unknown_error'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sync-status')?.textContent).toContain('Connection error');
    expect(compiled.querySelector('.session-alert')).toBeTruthy();
    expect(compiled.querySelector('.alert-hint')?.textContent).toContain('could not reach Strava');
  });

  it('should re-check session on retry button click', async () => {
    const checkSession = vi.fn().mockResolvedValue('login_required');
    configureApp(() => checkSession());
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();

    checkSession.mockReset().mockResolvedValue('login_required');
    const retryButton = fixture.nativeElement.querySelector('.alert-actions button:last-child') as HTMLButtonElement;
    expect(retryButton).toBeTruthy();
    expect(retryButton.textContent).toContain('Retry');
    retryButton.click();
    await flushMicrotasks();
    fixture.detectChanges();
    expect(checkSession).toHaveBeenCalledOnce();
  });

  it('should re-check session and dismiss banner when session is restored', async () => {
    let callIndex = 0;
    const results: SessionStatus[] = ['login_required', 'logged_in'];
    configureApp(() => Promise.resolve(results[callIndex++]));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.session-alert')).toBeTruthy();

    fixture.nativeElement.querySelector('.alert-actions button')?.click();
    await flushMicrotasks();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.session-alert')).toBeFalsy();
  });

  describe('sync summary', () => {
    it('should not show sync summary when there are no results', async () => {
      configureApp(() => Promise.resolve('logged_in'), () => undefined);
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await flushMicrotasks();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.sync-summary')).toBeFalsy();
    });

    it('should show sync summary when there are sync results', async () => {
      configureApp(
        () => Promise.resolve('logged_in'),
        () => ({
          id: 'default',
          status: 'completed',
          importedCount: 5,
          updatedCount: 2,
          routesSyncedCount: 3,
          skippedCount: 1,
          failedCount: 0,
        }),
      );
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await flushMicrotasks();
      fixture.detectChanges();

      const summary = fixture.nativeElement.querySelector('.sync-summary') as HTMLElement;
      expect(summary).toBeTruthy();
      expect(summary.textContent).toContain('Sync completed');
      expect(summary.textContent).toContain('Imported: 5');
      expect(summary.textContent).toContain('Updated: 2');
      expect(summary.textContent).toContain('Routes: 3');
      expect(summary.textContent).toContain('Skipped: 1');
      expect(summary.textContent).not.toContain('Failed');
    });

    it('should dismiss sync summary when dismiss button is clicked', async () => {
      configureApp(
        () => Promise.resolve('logged_in'),
        () => ({
          id: 'default',
          status: 'completed',
          importedCount: 3,
          updatedCount: 0,
          routesSyncedCount: 1,
          skippedCount: 0,
          failedCount: 0,
        }),
      );
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await flushMicrotasks();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.sync-summary')).toBeTruthy();

      const dismissButton = fixture.nativeElement.querySelector('.sync-summary-dismiss') as HTMLButtonElement;
      dismissButton.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.sync-summary')).toBeFalsy();
    });

    it('should show error message in sync summary when sync failed', async () => {
      configureApp(
        () => Promise.resolve('logged_in'),
        () => ({
          id: 'default',
          status: 'failed',
          importedCount: 2,
          updatedCount: 0,
          routesSyncedCount: 0,
          skippedCount: 0,
          failedCount: 1,
          lastErrorCode: 'ACTIVITY_ROUTE_FETCH_FAILED',
          lastErrorMessage: 'Failed to fetch route for activity 123',
        }),
      );
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await flushMicrotasks();
      fixture.detectChanges();

      const summary = fixture.nativeElement.querySelector('.sync-summary') as HTMLElement;
      expect(summary).toBeTruthy();
      expect(summary.textContent).toContain('Failed: 1');
      expect(summary.textContent).toContain('Error: Failed to fetch route for activity 123');
    });
  });
});

describe('ActivitiesPageComponent', () => {
  it('should render loading state initially', () => {
    TestBed.configureTestingModule({
      imports: [ActivitiesPageComponent],
    });

    const fixture = TestBed.createComponent(ActivitiesPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state-kicker')?.textContent).toContain('Loading');
  });
});

describe('MapPage', () => {
  let createMap: ReturnType<typeof vi.fn>;
  let onMapEvent: ReturnType<typeof vi.fn>;
  let renderRoutes: ReturnType<typeof vi.fn>;
  let selectRoute: ReturnType<typeof vi.fn>;
  let removeMap: ReturnType<typeof vi.fn>;

  const mockActivities = [{
    id: 'test:1',
    provider: 'strava' as const,
    providerActivityId: '1',
    name: 'Test Ride',
    sportType: 'Ride',
    activityCategory: 'ride' as const,
    startDate: '2024-01-01T00:00:00Z',
    distanceMeters: 10000,
    movingTimeSeconds: 1800,
    hasRoute: true,
    routeSyncStatus: 'route_synced' as const,
    sourceUrl: 'https://www.strava.com/activities/1',
    importedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }];

  const mockRoutes = [{
    activityId: 'test:1',
    providerActivityId: '1',
    coordinates: [[19.9, 50.05], [19.91, 50.06]] as [number, number][],
    pointCount: 2,
    bounds: { west: 19.9, south: 50.05, east: 19.91, north: 50.06 },
    syncedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }];

  function configureMapPage(queryParams: Record<string, string> = {}, activities = mockActivities, activityRoutes = mockRoutes): void {
    onMapEvent = vi.fn();
    renderRoutes = vi.fn();
    selectRoute = vi.fn();
    removeMap = vi.fn();
    createMap = vi.fn().mockResolvedValue({ once: onMapEvent, remove: removeMap });

    TestBed.configureTestingModule({
      imports: [MapPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap(queryParams)),
          },
        },
        {
          provide: MapLibreService,
          useValue: { createMap },
        },
        {
          provide: RouteRendererService,
          useValue: { renderRoutes, selectRoute },
        },
        {
          provide: TRAILROAM_REPOSITORIES,
          useValue: {
            activities: {
              list: vi.fn().mockResolvedValue(activities),
              count: vi.fn().mockResolvedValue(activities.length),
            },
            activityRoutes: {
              list: vi.fn().mockResolvedValue(activityRoutes),
            },
            syncState: { get: vi.fn().mockResolvedValue(undefined), clear: vi.fn() },
            settings: { get: vi.fn(), getOrCreateDefault: vi.fn() },
            accessState: { get: vi.fn() },
          },
        },
      ],
    });
  }

  it('should render map shell when no basemap error', async () => {
    configureMapPage();

    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.map-shell')).toBeTruthy();
  });

  it('should show no routes empty state when map loads with no routes', async () => {
    configureMapPage({}, [], []);

    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')?.textContent).toContain('No routes yet');
    expect(compiled.querySelector('.empty-state')?.textContent).toContain('Sync new activities');
  });

  it('should update to basemap error state when map loading fails', async () => {
    configureMapPage();

    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.componentInstance as any).showBasemapError();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.map-shell')).toBeFalsy();
    expect(compiled.querySelector('.warning-state')?.textContent).toContain('Basemap unavailable');
  });

  it('should show route detail panel after route click selection', async () => {
    configureMapPage();

    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.componentInstance as any).selectRoute({
      activityId: 'test:1',
      activity: mockActivities[0],
      route: mockRoutes[0],
      coordinates: mockRoutes[0].coordinates,
      name: 'Test Ride',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.route-detail-title')?.textContent).toContain('Test Ride');
  });

  it('should render basemap error state from query param', () => {
    configureMapPage({ basemapError: 'true' });

    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.map-shell')).toBeFalsy();
    expect(compiled.querySelector('.warning-state')?.textContent).toContain('Basemap unavailable');
    expect(compiled.querySelector('.warning-state')?.textContent).toContain('local activities and routes are unaffected');
  });

  it('should show no-route state when activityId does not match any route', async () => {
    configureMapPage({ activityId: 'strava:999' });

    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')?.textContent).toContain('No route available');
  });

  it('should show browse all activities button for no-route state', async () => {
    configureMapPage({ activityId: 'strava:999' });

    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const browseButton = compiled.querySelector('.secondary-action') as HTMLButtonElement;
    expect(browseButton).toBeTruthy();
    expect(browseButton.textContent).toContain('Browse all activities');
  });
});

describe('SettingsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function configureSettingsPage(clearSyncedLocalData = vi.fn().mockResolvedValue(undefined)): void {
    TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        {
          provide: LocalDataService,
          useValue: {
            clearSyncedLocalData,
          },
        },
      ],
    });
  }

  it('should render clear synced local data action', () => {
    configureSettingsPage();

    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const clearDataArticle = compiled.querySelector('[aria-labelledby="clear-local-data-title"]');
    expect(clearDataArticle?.textContent).toContain('Clear synced local data');
    expect(clearDataArticle?.textContent).toContain('Settings and access state are kept');
  });

  it('should ask for confirmation before clearing synced local data', async () => {
    const clearSyncedLocalData = vi.fn().mockResolvedValue(undefined);
    configureSettingsPage(clearSyncedLocalData);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.danger-action') as unknown as HTMLButtonElement[];
    const clearButton = Array.from(buttons).find((b) => b.textContent?.includes('Clear synced local data'));
    clearButton?.click();
    await fixture.whenStable();

    expect(confirm).toHaveBeenCalledWith(
      'This will delete imported activities and routes from this browser. It will not delete anything from Strava.',
    );
    expect(clearSyncedLocalData).not.toHaveBeenCalled();
  });

  it('should clear synced local data and update status after confirmation', async () => {
    const clearSyncedLocalData = vi.fn().mockResolvedValue(undefined);
    configureSettingsPage(clearSyncedLocalData);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.danger-action') as unknown as HTMLButtonElement[];
    const clearButton = Array.from(buttons).find((b) => b.textContent?.includes('Clear synced local data'));
    clearButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(clearSyncedLocalData).toHaveBeenCalledOnce();
    expect(compiled.querySelector('[role="status"]')?.textContent).toContain(
      'Imported activities, routes, and sync state were cleared.',
    );
  });
});
