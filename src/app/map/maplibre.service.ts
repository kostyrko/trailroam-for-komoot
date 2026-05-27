import { Injectable } from '@angular/core';
import { type Map } from 'maplibre-gl';

export const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

@Injectable({
  providedIn: 'root',
})
export class MapLibreService {
  async createMap(container: HTMLElement): Promise<Map> {
    const maplibregl = await import('maplibre-gl');

    return new maplibregl.Map({
      container,
      style: OPENFREEMAP_STYLE_URL,
      center: [19.94498, 50.06465],
      zoom: 10,
    });
  }
}
