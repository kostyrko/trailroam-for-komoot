import { Injectable } from '@angular/core';
import type { Map } from 'maplibre-gl';
import { type ResolvedBasemapProvider } from './basemap-provider';

/** Hosts the extension is allowed to fetch tiles from. */
const ALLOWED_TILE_HOSTS = [
  'tiles.openfreemap.org',
];

const DEFAULT_CENTER: [number, number] = [19.94498, 50.06465];
const DEFAULT_ZOOM = 10;

@Injectable({
  providedIn: 'root',
})
export class MapLibreService {
  async createMap(container: HTMLElement, basemapProvider: ResolvedBasemapProvider): Promise<Map> {
    const { default: maplibregl } = await import('maplibre-gl');

    const center = await this.getBrowserLocation();

    const map = new maplibregl.Map({
      container,
      style: basemapProvider.style,
      center,
      zoom: center === DEFAULT_CENTER ? DEFAULT_ZOOM : 12,
      transformRequest: (url, resourceType) => {
        if (
          resourceType !== undefined &&
          (resourceType === 'Style' || resourceType === 'Source' || resourceType === 'Tile')
        ) {
          const host = new URL(url).hostname;
          if (ALLOWED_TILE_HOSTS.some((allowed) => host === allowed || host.endsWith('.' + allowed))) {
            return { url, credentials: 'same-origin' };
          }
        }
        return undefined;
      },
    });

    return map;
  }

  private async getBrowserLocation(): Promise<[number, number]> {
    if (!navigator.geolocation) {
      return DEFAULT_CENTER;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 300000,
        });
      });
      return [pos.coords.longitude, pos.coords.latitude];
    } catch {
      return DEFAULT_CENTER;
    }
  }
}
