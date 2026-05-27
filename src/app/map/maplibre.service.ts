import { Injectable } from '@angular/core';
import type { Map } from 'maplibre-gl';
import { type ResolvedBasemapProvider } from './basemap-provider';

/** Hosts the extension is allowed to fetch tiles from. */
const ALLOWED_TILE_HOSTS = [
  'tiles.openfreemap.org',
];

@Injectable({
  providedIn: 'root',
})
export class MapLibreService {
  async createMap(container: HTMLElement, basemapProvider: ResolvedBasemapProvider): Promise<Map> {
    const { default: maplibregl } = await import('maplibre-gl');

    const map = new maplibregl.Map({
      container,
      style: basemapProvider.style,
      center: [19.94498, 50.06465],
      zoom: 10,
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
}
