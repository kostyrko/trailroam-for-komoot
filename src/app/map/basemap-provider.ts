import { type StyleSpecification } from 'maplibre-gl';

export type BasemapProviderKind =
  | 'openfreemap'
  | 'maplibre_style_url'
  | 'raster_xyz'
  | 'provider_preset'
  | 'pmtiles';

export type BasemapProviderPreset = 'maptiler' | 'geoapify' | 'stadia';

export interface BasemapProviderConfig {
  id: string;
  label: string;
  kind: BasemapProviderKind;
  providerPreset?: BasemapProviderPreset;
  styleUrl?: string;
  rasterTileUrl?: string;
  apiKey?: string;
  attribution?: string;
  requiresApiKey: boolean;
  enabled: boolean;
}

export type BasemapStyle = string | StyleSpecification;

export interface ResolvedBasemapProvider {
  config: BasemapProviderConfig;
  style: BasemapStyle;
}

export const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export const OPENFREEMAP_BASEMAP_PROVIDER: BasemapProviderConfig = {
  id: 'openfreemap',
  label: 'OpenFreeMap',
  kind: 'openfreemap',
  styleUrl: OPENFREEMAP_STYLE_URL,
  attribution: 'OpenFreeMap | OpenMapTiles | OpenStreetMap',
  requiresApiKey: false,
  enabled: true,
};
