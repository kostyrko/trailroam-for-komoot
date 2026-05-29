import { Injectable } from '@angular/core';
import { type FilterSpecification, type Map as MapLibreMap, type MapLayerMouseEvent } from 'maplibre-gl';
import { type MapRouteFeature } from './mock-routes';

export const ROUTES_SOURCE_ID = 'trailroam-routes';
export const ROUTES_LAYER_ID = 'trailroam-route-lines';
export const ROUTES_SELECTED_LAYER_ID = 'trailroam-route-selected';

export type RouteSelectedHandler = (route: MapRouteFeature) => void;

@Injectable({
  providedIn: 'root',
})
export class RouteRendererService {
  private initialized = false;

  renderRoutes(map: MapLibreMap, routes: MapRouteFeature[], routeSelected: RouteSelectedHandler): void {
    const features = routes.map((route) => ({
      type: 'Feature' as const,
      properties: { activityId: route.activityId, name: route.name },
      geometry: { type: 'LineString' as const, coordinates: route.coordinates },
    }));

    if (this.initialized) {
      const source = map.getSource(ROUTES_SOURCE_ID) as any;
      if (source) {
        source.setData({ type: 'FeatureCollection', features });
      }
      return;
    }
    this.initialized = true;

    map.addSource(ROUTES_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    map.addLayer({
      id: `${ROUTES_LAYER_ID}-casing`,
      type: 'line',
      source: ROUTES_SOURCE_ID,
      paint: {
        'line-color': '#ffffff',
        'line-opacity': 0.9,
        'line-width': 7,
      },
    });

    map.addLayer({
      id: ROUTES_LAYER_ID,
      type: 'line',
      source: ROUTES_SOURCE_ID,
      paint: {
        'line-color': '#1f6f50',
        'line-opacity': 0.9,
        'line-width': 4,
      },
    });

    map.addLayer({
      id: ROUTES_SELECTED_LAYER_ID,
      type: 'line',
      source: ROUTES_SOURCE_ID,
      filter: this.buildSelectedRouteFilter(''),
      paint: {
        'line-color': '#d15b2f',
        'line-opacity': 1,
        'line-width': 7,
      },
    });

    const routesLookup = new Map(routes.map((r) => [r.activityId, r]));

    map.on('click', ROUTES_LAYER_ID, (event: MapLayerMouseEvent) => {
      const activityId = event.features?.[0]?.properties?.['activityId'];

      if (typeof activityId !== 'string') {
        return;
      }

      const selectedRoute = routesLookup.get(activityId);
      if (!selectedRoute) {
        return;
      }

      map.setFilter(ROUTES_SELECTED_LAYER_ID, this.buildSelectedRouteFilter(selectedRoute.activityId));
      routeSelected(selectedRoute);
    });

    map.on('mouseenter', ROUTES_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', ROUTES_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });
  }

  selectRoute(map: MapLibreMap, activityId: string): void {
    map.setFilter(ROUTES_SELECTED_LAYER_ID, this.buildSelectedRouteFilter(activityId));
  }

  private buildSelectedRouteFilter(activityId: string): FilterSpecification {
    return ['==', ['get', 'activityId'], activityId];
  }
}
