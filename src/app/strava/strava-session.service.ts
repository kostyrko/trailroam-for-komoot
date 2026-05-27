import { Injectable } from '@angular/core';

export type SessionStatus = 'logged_in' | 'login_required' | 'unknown_error';

export interface StravaActivityResponse {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  has_heartrate?: boolean;
  /** @deprecated Use sport_type instead */
  type?: string;
}

export interface ActivityListParams {
  /** Page number (1-based) */
  page: number;
  /** Results per page */
  perPage: number;
  /** Only return activities before this timestamp (Unix epoch seconds) */
  before?: number;
  /** Only return activities after this timestamp (Unix epoch seconds) */
  after?: number;
}

export type ActivityFetchResult =
  | { success: true; activities: StravaActivityResponse[]; status: SessionStatus }
  | { success: false; errorCode: string; status: SessionStatus };

export type RouteFetchResult =
  | { success: true; latlng: [number, number][] }
  | { success: false; errorCode: string }
  | { success: false; errorCode: 'NO_GPS_ROUTE' }
  | { success: false; errorCode: 'ACTIVITY_ROUTE_FETCH_FAILED' };

const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/athlete/training/activities';
const STRAVA_STREAMS_URL = 'https://www.strava.com/api/v3/activities';

const KNOWN_RESPONSE_PATTERNS: { pattern: RegExp; status: SessionStatus }[] = [
  { pattern: /"data":\s*\[/i, status: 'logged_in' },
  { pattern: /"activities":/i, status: 'logged_in' },
  { pattern: /login|log in|sign in/i, status: 'login_required' },
  { pattern: /strava\.com\/login/i, status: 'login_required' },
];

@Injectable({
  providedIn: 'root',
})
export class StravaSessionService {
  /**
   * Check whether the user has an active Strava browser session.
   *
   * Makes a lightweight request to a Strava endpoint that behaves differently
   * when logged in vs logged out. The response shape is inspected rather than
   * parsed, since exact endpoints may change.
   */
  async checkSession(): Promise<SessionStatus> {
    try {
      const response = await fetch(STRAVA_ACTIVITIES_URL, {
        credentials: 'include',
        method: 'HEAD',
      });
      return this.inferSessionFromResponse(response);
    } catch {
      try {
        return await this.checkSessionViaTextFetch();
      } catch {
        return 'unknown_error';
      }
    }
  }

  /**
   * Fetch activity list from the logged-in Strava session.
   *
   * Uses the athlete training activities endpoint which returns JSON when
   * accessed with an active session.
   */
  async fetchActivityList(params: ActivityListParams): Promise<ActivityFetchResult> {
    const url = new URL(STRAVA_ACTIVITIES_URL);
    url.searchParams.set('page', String(params.page));
    url.searchParams.set('per_page', String(params.perPage));
    if (params.before !== undefined) {
      url.searchParams.set('before', String(params.before));
    }
    if (params.after !== undefined) {
      url.searchParams.set('after', String(params.after));
    }

    try {
      const response = await fetch(url.toString(), { credentials: 'include' });
      const sessionStatus = this.inferSessionFromResponse(response);

      if (sessionStatus !== 'logged_in') {
        return { success: false, errorCode: 'STRAVA_LOGIN_REQUIRED', status: sessionStatus };
      }

      const text = await response.text();
      const activities = this.parseActivityList(text);

      if (activities === null) {
        return { success: false, errorCode: 'ACTIVITY_LIST_FETCH_FAILED', status: 'logged_in' };
      }

      return { success: true, activities, status: 'logged_in' };
    } catch {
      return { success: false, errorCode: 'STRAVA_REQUEST_FAILED', status: 'unknown_error' };
    }
  }

  /**
   * Fetch GPS stream data for a Strava activity.
   *
   * Requests the `latlng` stream from the Strava API. This requires the
   * user's session to be active, as API v3 endpoints also respect the
   * browser session cookie.
   */
  async fetchActivityRoute(activityId: number): Promise<RouteFetchResult> {
    const url = `${STRAVA_STREAMS_URL}/${activityId}/streams?keys=latlng&key_by_type=true`;

    try {
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, errorCode: 'NO_GPS_ROUTE' };
        }
        if (response.status === 401) {
          return { success: false, errorCode: 'STRAVA_LOGIN_REQUIRED' };
        }
        return { success: false, errorCode: 'ACTIVITY_ROUTE_FETCH_FAILED' };
      }

      const data = await response.json();

      if (!data?.latlng || !Array.isArray(data.latlng.data) || data.latlng.data.length === 0) {
        return { success: false, errorCode: 'NO_GPS_ROUTE' };
      }

      const coordinates: [number, number][] = data.latlng.data.map(
        ([lat, lng]: [number, number]) => [lng, lat] as [number, number],
      );

      return { success: true, latlng: coordinates };
    } catch {
      return { success: false, errorCode: 'ACTIVITY_ROUTE_FETCH_FAILED' };
    }
  }

  /**
   * Normalize a caught error into a stable error code.
   */
  normalizeSessionError(error: unknown): string {
    if (error instanceof TypeError) {
      return 'STRAVA_REQUEST_FAILED';
    }
    if (error instanceof DOMException) {
      return 'STRAVA_REQUEST_FAILED';
    }
    return 'STRAVA_REQUEST_FAILED';
  }

  private inferSessionFromResponse(response: Response): SessionStatus {
    if (!response.ok && response.status === 401) {
      return 'login_required';
    }

    if (!response.ok && response.status === 302) {
      return 'login_required';
    }

    if (!response.ok) {
      return 'login_required';
    }

    return 'logged_in';
  }

  private async checkSessionViaTextFetch(): Promise<SessionStatus> {
    const response = await fetch(STRAVA_ACTIVITIES_URL, {
      credentials: 'include',
    });

    if (!response.ok) {
      return 'login_required';
    }

    const text = await response.text();

    for (const { pattern, status } of KNOWN_RESPONSE_PATTERNS) {
      if (pattern.test(text)) {
        return status;
      }
    }

    return 'unknown_error';
  }

  private parseActivityList(text: string): StravaActivityResponse[] | null {
    if (text.length === 0) {
      return null;
    }

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed?.data && Array.isArray(parsed.data)) {
        return parsed.data;
      }
      return null;
    } catch {
      return null;
    }
  }
}
