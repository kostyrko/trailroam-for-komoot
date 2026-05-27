export interface MockRoute {
  activityId: string;
  name: string;
  coordinates: [number, number][];
}

export const MOCK_ROUTES: MockRoute[] = [
  {
    activityId: 'mock-krakow-loop',
    name: 'Krakow river loop',
    coordinates: [
      [19.9007, 50.0557],
      [19.9165, 50.0509],
      [19.9361, 50.0516],
      [19.9557, 50.0551],
      [19.9695, 50.0632],
      [19.9523, 50.0712],
      [19.9274, 50.0701],
      [19.9078, 50.0642],
      [19.9007, 50.0557],
    ],
  },
  {
    activityId: 'mock-las-wolski-climb',
    name: 'Las Wolski climb',
    coordinates: [
      [19.8625, 50.0528],
      [19.8692, 50.0588],
      [19.8786, 50.0619],
      [19.8875, 50.0634],
      [19.9006, 50.0686],
      [19.9151, 50.0754],
    ],
  },
  {
    activityId: 'mock-nowa-huta-run',
    name: 'Nowa Huta run',
    coordinates: [
      [20.0039, 50.0728],
      [20.0198, 50.075],
      [20.0344, 50.0798],
      [20.0489, 50.0747],
      [20.0448, 50.0668],
      [20.0256, 50.0643],
      [20.0088, 50.0671],
    ],
  },
];
