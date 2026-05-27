import { mapSportTypeToCategory } from './activity-category';

describe('mapSportTypeToCategory', () => {
  it('should map Ride to ride', () => {
    expect(mapSportTypeToCategory('Ride')).toBe('ride');
  });

  it('should map MountainBikeRide to ride', () => {
    expect(mapSportTypeToCategory('MountainBikeRide')).toBe('ride');
  });

  it('should map GravelRide to ride', () => {
    expect(mapSportTypeToCategory('GravelRide')).toBe('ride');
  });

  it('should map EBikeRide to ride', () => {
    expect(mapSportTypeToCategory('EBikeRide')).toBe('ride');
  });

  it('should map Walk to walk', () => {
    expect(mapSportTypeToCategory('Walk')).toBe('walk');
  });

  it('should map Hike to walk', () => {
    expect(mapSportTypeToCategory('Hike')).toBe('walk');
  });

  it('should map Run to run', () => {
    expect(mapSportTypeToCategory('Run')).toBe('run');
  });

  it('should map TrailRun to run', () => {
    expect(mapSportTypeToCategory('TrailRun')).toBe('run');
  });

  it('should map Kayaking to paddling', () => {
    expect(mapSportTypeToCategory('Kayaking')).toBe('paddling');
  });

  it('should map StandUpPaddling to paddling', () => {
    expect(mapSportTypeToCategory('StandUpPaddling')).toBe('paddling');
  });

  it('should map Ski to winter', () => {
    expect(mapSportTypeToCategory('Ski')).toBe('winter');
  });

  it('should map NordicSki to winter', () => {
    expect(mapSportTypeToCategory('NordicSki')).toBe('winter');
  });

  it('should map Yoga to other', () => {
    expect(mapSportTypeToCategory('Yoga')).toBe('other');
  });

  it('should map an unknown sport type to other', () => {
    expect(mapSportTypeToCategory('Skateboarding')).toBe('other');
  });

  it('should map an empty string to other', () => {
    expect(mapSportTypeToCategory('')).toBe('other');
  });

  it('should be case-sensitive and return other for lowercase ride', () => {
    expect(mapSportTypeToCategory('ride')).toBe('other');
  });
});
