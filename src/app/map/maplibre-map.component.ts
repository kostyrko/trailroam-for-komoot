import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { type Map } from 'maplibre-gl';
import { MapLibreService } from './maplibre.service';

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

  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLElement>;

  private readonly mapLibreService = inject(MapLibreService);
  private isDestroyed = false;
  private map: Map | null = null;

  async ngAfterViewInit(): Promise<void> {
    let map: Map;

    try {
      map = await this.mapLibreService.createMap(this.mapContainer.nativeElement);
    } catch {
      this.basemapLoadFailed.emit();
      return;
    }

    if (this.isDestroyed) {
      map.remove();
      return;
    }

    map.once('error', () => {
      this.basemapLoadFailed.emit();
    });

    this.map = map;
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.map?.remove();
    this.map = null;
  }
}
