import { Injectable } from '@angular/core';
import type { ActivityRecord, ActivityRouteRecord } from '../storage/storage.models';
import { mapKomootSportToCategory } from '../shared/activity-category';
import type { KomootTourDetail, KomootTourListEntry } from './komoot-api.service';

export interface NormalizeResult {
  activity: ActivityRecord;
  route: ActivityRouteRecord | null;
}

@Injectable({ providedIn: 'root' })
export class KomootTourNormalizer {

  normalize(tour: KomootTourListEntry | KomootTourDetail, detail?: KomootTourDetail): NormalizeResult {
    const detailData = detail ?? ('_embedded' in tour && '_embedded' in (tour as any) ? tour as KomootTourDetail : undefined);
    const now = new Date().toISOString();

    const activity: ActivityRecord = {
      id: `komoot:${tour.id}`,
      provider: 'komoot',
      providerActivityId: String(tour.id),
      name: tour.name,
      sportType: tour.sport,
      activityCategory: mapKomootSportToCategory(tour.sport),
      startDate: tour.date,
      distanceMeters: tour.distance,
      movingTimeSeconds: tour.time_in_motion ?? tour.duration,
      elapsedTimeSeconds: tour.duration,
      totalElevationGainMeters: tour.elevation_up,
      averageSpeedMetersPerSecond: tour.distance > 0 && (tour.time_in_motion ?? tour.duration) > 0
        ? tour.distance / (tour.time_in_motion ?? tour.duration)
        : undefined,
      hasRoute: false,
      routeSyncStatus: 'not_attempted',
      sourceUrl: `https://www.komoot.de/tour/${tour.id}`,
      importedAt: now,
      updatedAt: now,
    };

    const coords = detailData?._embedded?.coordinates?.items;
    if (!coords || coords.length < 2) {
      activity.routeSyncStatus = 'no_route';
      return { activity, route: null };
    }

    activity.hasRoute = true;
    activity.routeSyncStatus = 'route_synced';

    const route: ActivityRouteRecord = {
      activityId: activity.id,
      providerActivityId: activity.providerActivityId,
      coordinates: coords.map((c) => [c.lng, c.lat] as [number, number]),
      pointCount: coords.length,
      elevations: coords.map((c) => c.alt).filter((a): a is number => a !== undefined),
      cumulativeDistances: this.computeCumulativeDistances(coords),
      syncedAt: now,
      updatedAt: now,
    };

    return { activity, route };
  }

  private computeCumulativeDistances(coords: { lat: number; lng: number }[]): number[] {
    const distances: number[] = [0];
    for (let i = 1; i < coords.length; i++) {
      const d = this.haversine(coords[i - 1].lng, coords[i - 1].lat, coords[i].lng, coords[i].lat);
      distances.push(distances[i - 1] + d);
    }
    return distances;
  }

  private haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
