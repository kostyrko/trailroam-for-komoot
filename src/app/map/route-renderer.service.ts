import { Injectable } from '@angular/core';
import { type FilterSpecification, type Map, type MapLayerMouseEvent } from 'maplibre-gl';
import { MOCK_ROUTES, type MockRoute } from './mock-routes';

export const MOCK_ROUTES_SOURCE_ID = 'trailroam-mock-routes';
export const MOCK_ROUTES_LAYER_ID = 'trailroam-mock-route-lines';
export const MOCK_ROUTES_SELECTED_LAYER_ID = 'trailroam-mock-route-selected';

type RouteSelectedHandler = (route: MockRoute) => void;

@Injectable({
  providedIn: 'root',
})
export class RouteRendererService {
  renderMockRoutes(map: Map, routeSelected: RouteSelectedHandler): void {
    map.addSource(MOCK_ROUTES_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: MOCK_ROUTES.map((route) => ({
          type: 'Feature',
          properties: {
            activityId: route.activityId,
            name: route.name,
          },
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates,
          },
        })),
      },
    });

    map.addLayer({
      id: `${MOCK_ROUTES_LAYER_ID}-casing`,
      type: 'line',
      source: MOCK_ROUTES_SOURCE_ID,
      paint: {
        'line-color': '#ffffff',
        'line-opacity': 0.9,
        'line-width': 7,
      },
    });

    map.addLayer({
      id: MOCK_ROUTES_LAYER_ID,
      type: 'line',
      source: MOCK_ROUTES_SOURCE_ID,
      paint: {
        'line-color': '#1f6f50',
        'line-opacity': 0.9,
        'line-width': 4,
      },
    });

    map.addLayer({
      id: MOCK_ROUTES_SELECTED_LAYER_ID,
      type: 'line',
      source: MOCK_ROUTES_SOURCE_ID,
      filter: this.buildSelectedRouteFilter(''),
      paint: {
        'line-color': '#d15b2f',
        'line-opacity': 1,
        'line-width': 7,
      },
    });

    map.on('click', MOCK_ROUTES_LAYER_ID, (event: MapLayerMouseEvent) => {
      const selectedRoute = this.findRouteFromEvent(event);

      if (!selectedRoute) {
        return;
      }

      map.setFilter(MOCK_ROUTES_SELECTED_LAYER_ID, this.buildSelectedRouteFilter(selectedRoute.activityId));
      routeSelected(selectedRoute);
    });

    map.on('mouseenter', MOCK_ROUTES_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', MOCK_ROUTES_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });
  }

  private findRouteFromEvent(event: MapLayerMouseEvent): MockRoute | undefined {
    const activityId = event.features?.[0]?.properties?.['activityId'];

    if (typeof activityId !== 'string') {
      return undefined;
    }

    return MOCK_ROUTES.find((route) => route.activityId === activityId);
  }

  private buildSelectedRouteFilter(activityId: string): FilterSpecification {
    return ['==', ['get', 'activityId'], activityId];
  }
}
