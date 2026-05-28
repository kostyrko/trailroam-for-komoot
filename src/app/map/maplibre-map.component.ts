import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { type Map } from 'maplibre-gl';
import { BasemapProviderService } from './basemap-provider.service';
import { type MapRouteFeature } from './mock-routes';
import { MapLibreService } from './maplibre.service';
import { RouteRendererService } from './route-renderer.service';

@Component({
  selector: 'app-maplibre-map',
  template: `
    <div class="map-shell" aria-label="Activity route map">
      <div #mapContainer class="map-container"></div>
    </div>
  `,
})
export class MapLibreMapComponent implements AfterViewInit, OnDestroy {
  @Output()
  readonly basemapLoadFailed = new EventEmitter<void>();

  @Output()
  readonly routeSelected = new EventEmitter<MapRouteFeature>();

  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLElement>;

  private readonly mapLibreService = inject(MapLibreService);
  private readonly basemapProviderService = inject(BasemapProviderService);
  private readonly routeRendererService = inject(RouteRendererService);
  private readonly ngZone = inject(NgZone);
  private isDestroyed = false;
  map: Map | null = null;

  async ngAfterViewInit(): Promise<void> {
    let map: Map;

    try {
      const basemapProvider = this.basemapProviderService.getSelectedProvider();
      map = await this.mapLibreService.createMap(this.mapContainer.nativeElement, basemapProvider);
    } catch (err) {
      console.error('MapLibre initialization failed:', err);
      this.emitBasemapLoadFailed();
      return;
    }

    if (this.isDestroyed) {
      map.remove();
      return;
    }

    map.once('error', (err) => {
      console.error('MapLibre runtime error:', err);
      this.emitBasemapLoadFailed();
    });

    this.map = map;
  }

  renderRouteFeatures(routes: MapRouteFeature[], selectActivityId?: string): void {
    const map = this.map;
    if (!map) {
      return;
    }

    this.routeRendererService.renderRoutes(map, routes, (route) => {
      this.ngZone.run(() => {
        this.routeSelected.emit(route);
      });
    });

    if (selectActivityId) {
      this.routeRendererService.selectRoute(map, selectActivityId);
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.map?.remove();
    this.map = null;
  }

  private emitBasemapLoadFailed(): void {
    this.ngZone.run(() => {
      this.basemapLoadFailed.emit();
    });
  }
}
