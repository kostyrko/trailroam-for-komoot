import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Routes } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-activities-page',
  template: `
    <section class="route-page" aria-labelledby="activities-title">
      <p class="eyebrow">Activities</p>
      <h1 id="activities-title">Activities</h1>

      <article class="empty-state" aria-labelledby="activities-empty-title">
        <p class="empty-state-kicker">No activities yet</p>
        <h2 id="activities-empty-title">Sync new activities to start building your local history.</h2>
        <p>
          Trailroam will show imported Strava activities here after the first successful sync.
        </p>
        <button class="primary-action" type="button">Sync new activities</button>
      </article>
    </section>
  `,
})
export class ActivitiesPage {}

@Component({
  selector: 'app-map-page',
  template: `
    <section class="route-page" aria-labelledby="map-title">
      <p class="eyebrow">Map</p>
      <h1 id="map-title">Map</h1>

      @if (selectedActivityId()) {
        <p class="route-state">Selected activity: {{ selectedActivityId() }}</p>
      }

      @if (hasBasemapError()) {
        <article class="empty-state warning-state" aria-labelledby="basemap-error-title" role="alert">
          <p class="empty-state-kicker">Basemap unavailable</p>
          <h2 id="basemap-error-title">The map background could not load.</h2>
          <p>
            Your local activities and routes are unaffected. Check your connection and try loading the map again.
          </p>
          <button class="primary-action" type="button">Retry map load</button>
        </article>
      } @else {
        <article class="empty-state" aria-labelledby="map-empty-title">
          <p class="empty-state-kicker">No routes yet</p>
          <h2 id="map-empty-title">Synced GPS routes will appear here.</h2>
          <p>
            Start a sync to import Strava activities and show available route lines on this map.
          </p>
          <button class="primary-action" type="button">Sync new activities</button>
        </article>
      }
    </section>
  `,
})
export class MapPage {
  private readonly route = inject(ActivatedRoute);
  private readonly activityId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('activityId'))),
    { initialValue: null },
  );
  private readonly basemapError = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('basemapError') === 'true')),
    { initialValue: false },
  );

  protected readonly selectedActivityId = computed(() => this.activityId());
  protected readonly hasBasemapError = computed(() => this.basemapError());
}

@Component({
  selector: 'app-settings-page',
  template: `
    <section class="route-page" aria-labelledby="settings-title">
      <p class="eyebrow">Settings</p>
      <h1 id="settings-title">Settings</h1>
      <p>Local extension settings will be configured here.</p>
    </section>
  `,
})
export class SettingsPage {}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'map',
  },
  {
    path: 'activities',
    component: ActivitiesPage,
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
