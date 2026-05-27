import { type Map } from 'maplibre-gl';
import { MOCK_ROUTES, type MockRoute } from './mock-routes';
import {
  MOCK_ROUTES_LAYER_ID,
  MOCK_ROUTES_SELECTED_LAYER_ID,
  MOCK_ROUTES_SOURCE_ID,
  RouteRendererService,
} from './route-renderer.service';

describe('RouteRendererService', () => {
  let addLayer: ReturnType<typeof vi.fn>;
  let addSource: ReturnType<typeof vi.fn>;
  let getCanvas: ReturnType<typeof vi.fn>;
  let map: Map;
  let on: ReturnType<typeof vi.fn>;
  let routeSelected: ReturnType<typeof vi.fn<(route: MockRoute) => void>>;
  let setFilter: ReturnType<typeof vi.fn>;
  let service: RouteRendererService;

  beforeEach(() => {
    addLayer = vi.fn();
    addSource = vi.fn();
    getCanvas = vi.fn().mockReturnValue({ style: { cursor: '' } });
    on = vi.fn();
    routeSelected = vi.fn<(route: MockRoute) => void>();
    setFilter = vi.fn();
    map = {
      addLayer,
      addSource,
      getCanvas,
      on,
      setFilter,
    } as unknown as Map;
    service = new RouteRendererService();
  });

  it('should render each mock route as a separate GeoJSON feature', () => {
    service.renderMockRoutes(map, routeSelected);

    expect(addSource).toHaveBeenCalledWith(
      MOCK_ROUTES_SOURCE_ID,
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'FeatureCollection',
          features: expect.arrayContaining(
            MOCK_ROUTES.map((route) =>
              expect.objectContaining({
                properties: expect.objectContaining({
                  activityId: route.activityId,
                  name: route.name,
                }),
                geometry: expect.objectContaining({
                  type: 'LineString',
                  coordinates: route.coordinates,
                }),
              }),
            ),
          ),
        }),
        type: 'geojson',
      }),
    );
    const sourceDefinition = addSource.mock.calls[0][1];
    expect(sourceDefinition.data.features).toHaveLength(MOCK_ROUTES.length);
  });

  it('should add route and selected-route layers', () => {
    service.renderMockRoutes(map, routeSelected);

    expect(addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: MOCK_ROUTES_LAYER_ID }));
    expect(addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: MOCK_ROUTES_SELECTED_LAYER_ID }));
  });

  it('should select and highlight the clicked route', () => {
    service.renderMockRoutes(map, routeSelected);
    const clickHandler = on.mock.calls.find(
      ([eventName, layerId]) => eventName === 'click' && layerId === MOCK_ROUTES_LAYER_ID,
    )?.[2];
    const route = MOCK_ROUTES[1];

    clickHandler({
      features: [
        {
          properties: {
            activityId: route.activityId,
          },
        },
      ],
    });

    expect(setFilter).toHaveBeenCalledWith(MOCK_ROUTES_SELECTED_LAYER_ID, [
      '==',
      ['get', 'activityId'],
      route.activityId,
    ]);
    expect(routeSelected).toHaveBeenCalledWith(route);
  });
});
