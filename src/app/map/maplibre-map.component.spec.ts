import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type Map } from 'maplibre-gl';
import { OPENFREEMAP_BASEMAP_PROVIDER, type ResolvedBasemapProvider } from './basemap-provider';
import { BasemapProviderService } from './basemap-provider.service';
import { MapLibreMapComponent } from './maplibre-map.component';
import { MapLibreService } from './maplibre.service';
import { MOCK_ROUTES } from './mock-routes';
import { RouteRendererService } from './route-renderer.service';

describe('MapLibreMapComponent', () => {
  let createMap: ReturnType<typeof vi.fn>;
  let getSelectedProvider: ReturnType<typeof vi.fn>;
  let once: ReturnType<typeof vi.fn>;
  let renderMockRoutes: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;
  let resolvedProvider: ResolvedBasemapProvider;
  let fixture: ComponentFixture<MapLibreMapComponent>;

  beforeEach(() => {
    resolvedProvider = {
      config: OPENFREEMAP_BASEMAP_PROVIDER,
      style: OPENFREEMAP_BASEMAP_PROVIDER.styleUrl!,
    };
    getSelectedProvider = vi.fn().mockReturnValue(resolvedProvider);
    once = vi.fn();
    renderMockRoutes = vi.fn();
    remove = vi.fn();
    createMap = vi.fn().mockResolvedValue({ once, remove } as unknown as Map);

    TestBed.configureTestingModule({
      imports: [MapLibreMapComponent],
      providers: [
        {
          provide: MapLibreService,
          useValue: { createMap },
        },
        {
          provide: BasemapProviderService,
          useValue: { getSelectedProvider },
        },
        {
          provide: RouteRendererService,
          useValue: { renderMockRoutes },
        },
      ],
    });
  });

  it('should initialize MapLibre in the map container', async () => {
    fixture = TestBed.createComponent(MapLibreMapComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.nativeElement.querySelector('.map-container') as HTMLElement;
    expect(getSelectedProvider).toHaveBeenCalledOnce();
    expect(createMap).toHaveBeenCalledWith(container, resolvedProvider);
  });

  it('should remove the MapLibre map on destroy', async () => {
    fixture = TestBed.createComponent(MapLibreMapComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.destroy();

    expect(remove).toHaveBeenCalledOnce();
  });

  it('should remove the MapLibre map if initialization finishes after destroy', async () => {
    fixture = TestBed.createComponent(MapLibreMapComponent);
    fixture.detectChanges();

    fixture.destroy();
    await fixture.whenStable();

    expect(remove).toHaveBeenCalledOnce();
  });

  it('should emit basemap load failure when MapLibre emits an error', async () => {
    const basemapLoadFailed = vi.fn();
    fixture = TestBed.createComponent(MapLibreMapComponent);
    fixture.componentInstance.basemapLoadFailed.subscribe(basemapLoadFailed);
    fixture.detectChanges();
    await fixture.whenStable();

    const errorHandler = once.mock.calls.find(([eventName]) => eventName === 'error')?.[1];
    errorHandler();

    expect(basemapLoadFailed).toHaveBeenCalledOnce();
  });

  it('should emit basemap load failure when map initialization fails', async () => {
    createMap.mockRejectedValue(new Error('style unavailable'));
    const basemapLoadFailed = vi.fn();
    fixture = TestBed.createComponent(MapLibreMapComponent);
    fixture.componentInstance.basemapLoadFailed.subscribe(basemapLoadFailed);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(basemapLoadFailed).toHaveBeenCalledOnce();
  });

  it('should render mock routes after MapLibre load', async () => {
    fixture = TestBed.createComponent(MapLibreMapComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const loadHandler = once.mock.calls.find(([eventName]) => eventName === 'load')?.[1];
    loadHandler();

    expect(renderMockRoutes).toHaveBeenCalledOnce();
  });

  it('should emit selected mock routes from the renderer callback', async () => {
    const routeSelected = vi.fn();
    fixture = TestBed.createComponent(MapLibreMapComponent);
    fixture.componentInstance.routeSelected.subscribe(routeSelected);
    fixture.detectChanges();
    await fixture.whenStable();

    const loadHandler = once.mock.calls.find(([eventName]) => eventName === 'load')?.[1];
    loadHandler();
    const rendererCallback = renderMockRoutes.mock.calls[0][1];
    rendererCallback(MOCK_ROUTES[0]);

    expect(routeSelected).toHaveBeenCalledWith(MOCK_ROUTES[0]);
  });
});
