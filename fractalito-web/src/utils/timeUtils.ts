// Time-to-coordinate conversion utilities

export function timeToX(timestamp: number, centerTime: number, msPerPixel: number, canvasWidth: number): number {
  const centerX = canvasWidth / 2;
  return centerX + (timestamp - centerTime) / msPerPixel;
}

export function xToTime(x: number, centerTime: number, msPerPixel: number, canvasWidth: number): number {
  const centerX = canvasWidth / 2;
  return centerTime + (x - centerX) * msPerPixel;
}

// 9 discrete zoom levels with their msPerPixel values
export const ZOOM_LEVELS = [
  { msPerPixel: 3_000, unit: '5min', tickInterval: 300_000 },         // 5 minutes
  { msPerPixel: 6_000, unit: '10min', tickInterval: 600_000 },        // 10 minutes
  { msPerPixel: 18_000, unit: '30min', tickInterval: 1_800_000 },     // 30 minutes
  { msPerPixel: 36_000, unit: 'hour', tickInterval: 3_600_000 },      // 1 hour
  { msPerPixel: 216_000, unit: '6hour', tickInterval: 21_600_000 },   // 6 hours
  { msPerPixel: 864_000, unit: 'day', tickInterval: 86_400_000 },     // 1 day
  { msPerPixel: 6_048_000, unit: 'week', tickInterval: 604_800_000 }, // 1 week
  { msPerPixel: 25_920_000, unit: 'month', tickInterval: 2_592_000_000 }, // 1 month (~30 days)
  { msPerPixel: 315_360_000, unit: 'year', tickInterval: 31_536_000_000 }, // 1 year
] as const;

export const MIN_MS_PER_PIXEL = ZOOM_LEVELS[0].msPerPixel;
export const MAX_MS_PER_PIXEL = ZOOM_LEVELS[ZOOM_LEVELS.length - 1].msPerPixel;

// Get the current zoom level index (0-4)
export function getZoomLevelIndex(msPerPixel: number): number {
  for (let i = 0; i < ZOOM_LEVELS.length; i++) {
    if (msPerPixel <= ZOOM_LEVELS[i].msPerPixel) return i;
  }
  return ZOOM_LEVELS.length - 1;
}

// Snap to nearest zoom level
export function clampZoom(msPerPixel: number): number {
  const index = getZoomLevelIndex(msPerPixel);
  return ZOOM_LEVELS[index].msPerPixel;
}

// Get appropriate time unit for current zoom level
export function getTimeUnit(msPerPixel: number): '5min' | '10min' | '30min' | 'hour' | '6hour' | 'day' | 'week' | 'month' | 'year' {
  const index = getZoomLevelIndex(msPerPixel);
  return ZOOM_LEVELS[index].unit;
}

// Get zoom level category (for filtering moments)
export function getZoomLevel(msPerPixel: number): 'minute' | 'hour' | '6hour' | 'day' | 'week' | 'month' | 'year' {
  const unit = getTimeUnit(msPerPixel);
  if (unit === 'year') return 'year';
  if (unit === 'month') return 'month';
  if (unit === 'week') return 'week';
  if (unit === 'day') return 'day';
  if (unit === '6hour') return '6hour';
  if (unit === 'hour') return 'hour';
  return 'minute';
}

// Generate tick intervals based on zoom level
export function getTickInterval(msPerPixel: number): number {
  const index = getZoomLevelIndex(msPerPixel);
  return ZOOM_LEVELS[index].tickInterval;
}

// Get default moment width in pixels based on zoom level
// Returns width representing a reasonable time span for the current zoom
export function getDefaultMomentWidth(msPerPixel: number): number {
  const unit = getTimeUnit(msPerPixel);
  
  // Map zoom levels to default durations (in ms)
  const defaultDurations: Record<string, number> = {
    '5min': 5 * 60 * 1000,           // 5 minutes
    '10min': 10 * 60 * 1000,         // 10 minutes
    '30min': 30 * 60 * 1000,         // 30 minutes
    'hour': 60 * 60 * 1000,          // 1 hour
    '6hour': 2 * 60 * 60 * 1000,     // 2 hours
    'day': 4 * 60 * 60 * 1000,       // 4 hours
    'week': 24 * 60 * 60 * 1000,     // 1 day
    'month': 7 * 24 * 60 * 60 * 1000, // 1 week
    'year': 30 * 24 * 60 * 60 * 1000, // 1 month
  };
  
  const duration = defaultDurations[unit] || 60 * 60 * 1000; // fallback to 1 hour
  const width = duration / msPerPixel;
  
  // Cap width between reasonable bounds (60-300 pixels)
  return Math.max(60, Math.min(300, width));
}
