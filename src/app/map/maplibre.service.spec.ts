import { OPENFREEMAP_STYLE_URL } from './maplibre.service';

describe('MapLibreService', () => {
  it('should use the keyless OpenFreeMap Liberty style URL', () => {
    const styleUrl = new URL(OPENFREEMAP_STYLE_URL);

    expect(styleUrl.origin).toBe('https://tiles.openfreemap.org');
    expect(styleUrl.pathname).toBe('/styles/liberty');
    expect(styleUrl.search).toBe('');
  });
});
