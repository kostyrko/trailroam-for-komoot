import { Component, computed, input } from '@angular/core';

const SVG_W = 44;
const SVG_H = 32;

function downsample(points: [number, number][], maxPoints: number): [number, number][] {
  if (points.length <= maxPoints) { return points; }
  const step = (points.length - 1) / (maxPoints - 1);
  const result: [number, number][] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step);
    result.push(points[idx]);
  }
  return result;
}

@Component({
  selector: 'app-route-sparkline',
  template: `
    <svg
      class="route-sparkline"
      [attr.width]="SVG_W"
      [attr.height]="SVG_H"
      [attr.viewBox]="'0 0 ' + SVG_W + ' ' + SVG_H"
      aria-hidden="true"
    >
      <rect x="0" y="0" [attr.width]="SVG_W" [attr.height]="SVG_H" fill="#eef5f0" rx="2" />
      @if (polylinePoints(); as pts) {
        <polyline [attr.points]="pts" fill="none" stroke="#1f6f50" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      } @else {
        <line x1="2" y1="16" x2="42" y2="16" stroke="#dce6df" stroke-width="1.5" stroke-dasharray="2,2" />
      }
    </svg>
  `,
  styles: [`
    .route-sparkline {
      border-radius: 3px;
      display: block;
      flex-shrink: 0;
    }
  `],
})
export class RouteSparklineComponent {
  protected readonly SVG_W = SVG_W;
  protected readonly SVG_H = SVG_H;

  readonly coordinates = input<[number, number][] | null>(null);

  protected readonly polylinePoints = computed<string | null>(() => {
    const coords = this.coordinates();
    if (!coords || coords.length < 2) { return null; }
    const sampled = downsample(coords, 30);
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of sampled) {
      if (lng < minLng) { minLng = lng; }
      if (lng > maxLng) { maxLng = lng; }
      if (lat < minLat) { minLat = lat; }
      if (lat > maxLat) { maxLat = lat; }
    }
    const rangeLng = maxLng - minLng || 1;
    const rangeLat = maxLat - minLat || 1;
    const pad = 4;
    const plotW = SVG_W - pad * 2;
    const plotH = SVG_H - pad * 2;
    const scaleX = plotW / rangeLng;
    const scaleY = plotH / rangeLat;
    return sampled.map(([lng, lat]) => {
      const x = pad + (lng - minLng) * scaleX;
      const y = SVG_H - pad - (lat - minLat) * scaleY;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  });
}
