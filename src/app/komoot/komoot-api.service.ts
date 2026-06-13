import { Injectable, inject } from '@angular/core';
import { KomootAuthService } from './komoot-auth.service';

const API_BASE = 'https://api.komoot.de';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export interface KomootTourListEntry {
  id: number;
  name: string;
  type: 'tour_planned' | 'tour_recorded';
  sport: string;
  status: 'public' | 'private';
  date: string;
  distance: number;
  duration: number;
  time_in_motion?: number;
  elevation_up: number;
  elevation_down: number;
  difficulty?: { grade: string };
  _embedded?: {
    creator?: { username: string; display_name: string };
    coordinates?: { items: KomootCoordinate[] };
  };
  _links?: {
    self?: { href: string };
  };
}

export interface KomootCoordinate {
  lat: number;
  lng: number;
  alt?: number;
  t?: number;
}

export interface KomootTourDetail {
  id: number;
  name: string;
  type: 'tour_planned' | 'tour_recorded';
  sport: string;
  status: 'public' | 'private';
  date: string;
  distance: number;
  duration: number;
  time_in_motion?: number;
  elevation_up: number;
  elevation_down: number;
  difficulty?: { grade: string };
  _embedded: {
    creator: { username: string; display_name: string };
    coordinates?: { items: KomootCoordinate[] };
    timeline?: any;
  };
}

interface KomootTourListResponse {
  _embedded: { tours: KomootTourListEntry[] };
  _links: { next?: { href: string }; self: { href: string } };
  page: { size: number; totalElements: number; totalPages: number; number: number };
}

export type FetchResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  errorCode: 'AUTH_INVALID' | 'NOT_FOUND' | 'ACCESS_DENIED' | 'RETRY_EXHAUSTED' | 'NETWORK_ERROR';
  status?: number;
}

@Injectable({ providedIn: 'root' })
export class KomootApiService {
  private readonly authService = inject(KomootAuthService);

  async fetchTourList(page: number): Promise<FetchResult<KomootTourListResponse>> {
    const creds = this.authService.getCredentials();
    if (!creds) { return { success: false, errorCode: 'AUTH_INVALID' }; }
    return this.request<KomootTourListResponse>(
      `${API_BASE}/v007/users/${creds.userId}/tours/?page=${page}`,
      creds,
    );
  }

  async fetchTourDetail(tourId: number): Promise<FetchResult<KomootTourDetail>> {
    const creds = this.authService.getCredentials();
    if (!creds) { return { success: false, errorCode: 'AUTH_INVALID' }; }
    return this.request<KomootTourDetail>(
      `${API_BASE}/v007/tours/${tourId}?_embedded=coordinates,way_types,surfaces,directions,participants,timeline&hl=en&directions=v2&format=coordinate_array&timeline_highlights_fields=tips,recommenders`,
      creds,
    );
  }

  async fetchTourGpx(tourId: number): Promise<FetchResult<string>> {
    const creds = this.authService.getCredentials();
    if (!creds) { return { success: false, errorCode: 'AUTH_INVALID' }; }
    const result = await this.requestRaw(
      `${API_BASE}/v007/tours/${tourId}.gpx`,
      creds,
    );
    if (!result.success) return result;
    return { success: true, data: result.data };
  }

  async fetchAllTours(options?: { knownTourIds?: string[]; signal?: AbortSignal }): Promise<{
    tours: KomootTourListEntry[];
    stoppedEarly: boolean;
  }> {
    const known = new Set(options?.knownTourIds ?? []);
    const tours: KomootTourListEntry[] = [];
    let page = 0;
    let stoppedEarly = false;

    while (true) {
      if (options?.signal?.aborted) break;

      const result = await this.fetchTourList(page);
      if (!result.success) {
        if (result.errorCode === 'AUTH_INVALID' || result.errorCode === 'RETRY_EXHAUSTED') break;
        page++;
        continue;
      }

      const batch = result.data._embedded.tours;
      if (batch.length === 0) break;

      for (const tour of batch) {
        if (known.has(String(tour.id))) {
          stoppedEarly = true;
          break;
        }
        tours.push(tour);
      }
      if (stoppedEarly) break;

      const hasNext = result.data._links.next?.href;
      if (!hasNext) break;
      page++;
    }

    return { tours, stoppedEarly };
  }

  private async request<T>(url: string, creds: { userId: string; token: string }, retry = 0): Promise<FetchResult<T>> {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${btoa(`${creds.userId}:${creds.token}`)}` },
      });

      if (response.ok) {
        return { success: true, data: (await response.json()) as T };
      }

      if (response.status === 401 || response.status === 403) {
        this.authService.invalidateToken();
        return { success: false, errorCode: 'AUTH_INVALID', status: response.status };
      }
      if (response.status === 404) {
        return { success: false, errorCode: 'NOT_FOUND', status: 404 };
      }

      if (retry < MAX_RETRIES) {
        await this.delay(INITIAL_BACKOFF_MS * Math.pow(2, retry));
        return this.request<T>(url, creds, retry + 1);
      }

      return { success: false, errorCode: 'RETRY_EXHAUSTED', status: response.status };
    } catch {
      if (retry < MAX_RETRIES) {
        await this.delay(INITIAL_BACKOFF_MS * Math.pow(2, retry));
        return this.request<T>(url, creds, retry + 1);
      }
      return { success: false, errorCode: 'NETWORK_ERROR' };
    }
  }

  private async requestRaw(url: string, creds: { userId: string; token: string }, retry = 0): Promise<FetchResult<string>> {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${btoa(`${creds.userId}:${creds.token}`)}` },
      });

      if (response.ok) {
        return { success: true, data: await response.text() };
      }

      if (response.status === 401 || response.status === 403) {
        this.authService.invalidateToken();
        return { success: false, errorCode: 'AUTH_INVALID', status: response.status };
      }
      if (response.status === 404) {
        return { success: false, errorCode: 'NOT_FOUND', status: 404 };
      }

      if (retry < MAX_RETRIES) {
        await this.delay(INITIAL_BACKOFF_MS * Math.pow(2, retry));
        return this.requestRaw(url, creds, retry + 1);
      }

      return { success: false, errorCode: 'RETRY_EXHAUSTED', status: response.status };
    } catch {
      if (retry < MAX_RETRIES) {
        await this.delay(INITIAL_BACKOFF_MS * Math.pow(2, retry));
        return this.requestRaw(url, creds, retry + 1);
      }
      return { success: false, errorCode: 'NETWORK_ERROR' };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
