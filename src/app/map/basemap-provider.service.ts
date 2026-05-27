import { Injectable } from '@angular/core';
import {
  OPENFREEMAP_BASEMAP_PROVIDER,
  type BasemapProviderConfig,
  type ResolvedBasemapProvider,
} from './basemap-provider';

@Injectable({
  providedIn: 'root',
})
export class BasemapProviderService {
  getDefaultProvider(): ResolvedBasemapProvider {
    return this.resolveProvider(OPENFREEMAP_BASEMAP_PROVIDER);
  }

  getSelectedProvider(): ResolvedBasemapProvider {
    return this.getDefaultProvider();
  }

  resolveProvider(config: BasemapProviderConfig): ResolvedBasemapProvider {
    if (!config.enabled) {
      throw new Error(`Basemap provider is disabled: ${config.id}`);
    }

    if (!config.styleUrl) {
      throw new Error(`Basemap provider is missing a MapLibre style URL: ${config.id}`);
    }

    return {
      config,
      style: config.styleUrl,
    };
  }
}
