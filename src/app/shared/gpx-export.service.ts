import { Injectable, inject } from '@angular/core';
import { TRAILROAM_REPOSITORIES } from '../storage/repositories/repositories.token';
import type { ActivityRecord, ActivityRouteRecord } from '../storage/storage.models';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100) || 'activity';
}

function buildGpx(activity: ActivityRecord, route: ActivityRouteRecord): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Trailroam for Strava"',
    '  xmlns="http://www.topografix.com/GPX/1/1">',
    '  <trk>',
    `    <name>${escapeXml(activity.name)}</name>`,
    ...(activity.startDate
      ? [`    <time>${new Date(activity.startDate).toISOString()}</time>`]
      : []),
    '    <trkseg>',
  ];

  for (const [lng, lat] of route.coordinates) {
    lines.push(`      <trkpt lat="${lat}" lon="${lng}"></trkpt>`);
  }

  lines.push(
    '    </trkseg>',
    '  </trk>',
    '</gpx>',
  );

  return lines.join('\n');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

@Injectable({ providedIn: 'root' })
export class GpxExportService {
  private readonly repositories = inject(TRAILROAM_REPOSITORIES);

  async exportActivity(activity: ActivityRecord): Promise<{ success: true } | { success: false; reason: string }> {
    if (!activity.hasRoute || activity.routeSyncStatus !== 'route_synced') {
      return { success: false, reason: `No GPS route available for "${activity.name}".` };
    }

    const route = await this.repositories.activityRoutes.get(activity.id);
    if (!route || route.coordinates.length < 2) {
      return { success: false, reason: `No GPS route available for "${activity.name}".` };
    }

    const gpx = buildGpx(activity, route);
    const filename = `${slugify(activity.name)}.gpx`;
    triggerDownload(gpx, filename);
    return { success: true };
  }
}
