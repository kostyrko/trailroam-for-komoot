import {
  OPENFREEMAP_BASEMAP_PROVIDER,
  OPENFREEMAP_STYLE_URL,
  type BasemapProviderConfig,
} from './basemap-provider';
import { BasemapProviderService } from './basemap-provider.service';

describe('BasemapProviderService', () => {
  let service: BasemapProviderService;

  beforeEach(() => {
    service = new BasemapProviderService();
  });

  it('should expose the keyless OpenFreeMap provider as the default provider', () => {
    const provider = service.getDefaultProvider();
    const styleUrl = new URL(provider.style as string);

    expect(provider.config).toEqual(OPENFREEMAP_BASEMAP_PROVIDER);
    expect(provider.config.id).toBe('openfreemap');
    expect(provider.config.kind).toBe('openfreemap');
    expect(provider.config.requiresApiKey).toBe(false);
    expect(provider.config.enabled).toBe(true);
    expect(styleUrl.origin).toBe('https://tiles.openfreemap.org');
    expect(styleUrl.pathname).toBe('/styles/liberty');
    expect(styleUrl.search).toBe('');
  });

  it('should resolve future MapLibre style URL providers through the same interface', () => {
    const providerConfig: BasemapProviderConfig = {
      id: 'custom_style',
      label: 'Custom style',
      kind: 'maplibre_style_url',
      styleUrl: 'https://example.com/style.json',
      requiresApiKey: true,
      enabled: true,
    };

    expect(service.resolveProvider(providerConfig)).toEqual({
      config: providerConfig,
      style: providerConfig.styleUrl,
    });
  });

  it('should keep provider presets representable for later MapTiler Geoapify and Stadia support', () => {
    const providerConfig: BasemapProviderConfig = {
      id: 'maptiler',
      label: 'MapTiler',
      kind: 'provider_preset',
      providerPreset: 'maptiler',
      styleUrl: 'https://api.maptiler.com/maps/outdoor/style.json?key=test',
      apiKey: 'test',
      requiresApiKey: true,
      enabled: true,
    };

    expect(service.resolveProvider(providerConfig).config.providerPreset).toBe('maptiler');
  });

  it('should reject providers that cannot produce a MapLibre style yet', () => {
    const providerConfig: BasemapProviderConfig = {
      id: 'raster_provider',
      label: 'Raster provider',
      kind: 'raster_xyz',
      rasterTileUrl: 'https://example.com/{z}/{x}/{y}.png',
      requiresApiKey: false,
      enabled: true,
    };

    expect(() => service.resolveProvider(providerConfig)).toThrow(/style URL/);
  });

  it('should keep the exported OpenFreeMap style URL aligned with the provider config', () => {
    expect(OPENFREEMAP_BASEMAP_PROVIDER.styleUrl).toBe(OPENFREEMAP_STYLE_URL);
  });
});
