import type { ActivityCategory } from '../storage/storage.models';

const SPORT_TYPE_CATEGORY_MAP: Record<string, ActivityCategory> = {
  Ride: 'ride',
  MountainBikeRide: 'ride',
  GravelRide: 'ride',
  EBikeRide: 'ride',
  EMountainBikeRide: 'ride',
  VirtualRide: 'ride',
  Walk: 'walk',
  Hike: 'walk',
  Run: 'run',
  TrailRun: 'run',
  VirtualRun: 'run',
  Swim: 'water',
  Kayaking: 'paddling',
  Canoeing: 'paddling',
  StandUpPaddling: 'paddling',
  Rowing: 'paddling',
  Surfing: 'water',
  Windsurfing: 'water',
  Kitesurf: 'water',
  WinterSport: 'winter',
  Ski: 'winter',
  BackcountrySki: 'winter',
  NordicSki: 'winter',
  Snowboard: 'winter',
  Snowshoe: 'winter',
  IceSkate: 'winter',
  Workout: 'other',
  Yoga: 'other',
  Pilates: 'other',
  Crossfit: 'other',
  Elliptical: 'other',
  StairStepper: 'other',
  WeightTraining: 'other',
  StrengthTraining: 'other',
  Other: 'other',
};

const DEFAULT_CATEGORY: ActivityCategory = 'other';

export function mapSportTypeToCategory(sportType: string): ActivityCategory {
  return SPORT_TYPE_CATEGORY_MAP[sportType] ?? DEFAULT_CATEGORY;
}
