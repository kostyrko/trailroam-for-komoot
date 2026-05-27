import { Injectable } from '@angular/core';
import { type Map } from 'maplibre-gl';
import { type ResolvedBasemapProvider } from './basemap-provider';

@Injectable({
  providedIn: 'root',
})
export class MapLibreService {
  async createMap(container: HTMLElement, basemapProvider: ResolvedBasemapProvider): Promise<Map> {
    const maplibregl = await import('maplibre-gl');

    return new maplibregl.Map({
      container,
      style: basemapProvider.style,
      center: [19.94498, 50.06465],
      zoom: 10,
    });
  }
}
