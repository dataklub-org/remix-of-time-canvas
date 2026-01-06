// Time-to-coordinate conversion utilities

export function timeToX(timestamp: number, centerTime: number, msPerPixel: number, canvasWidth: number): number {
  const centerX = canvasWidth / 2;
  return centerX + (timestamp - centerTime) / msPerPixel;
}

export function xToTime(x: number, centerTime: number, msPerPixel: number, canvasWidth: number): number {
  const centerX = canvasWidth / 2;
  return centerTime + (x - centerX) * msPerPixel;
}

// 5 discrete zoom levels with their msPerPixel values
export const ZOOM_LEVELS = [
  { msPerPixel: 9_000, unit: '15min', tickInterval: 900_000 },        // 15 minutes
  { msPerPixel: 36_000, unit: 'hour', tickInterval: 3_600_000 },      // 1 hour
  { msPerPixel: 864_000, unit: 'day', tickInterval: 86_400_000 },     // 1 day
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
export function getTimeUnit(msPerPixel: number): '15min' | 'hour' | 'day' | 'month' | 'year' {
  const index = getZoomLevelIndex(msPerPixel);
  return ZOOM_LEVELS[index].unit;
}

// Generate tick intervals based on zoom level
export function getTickInterval(msPerPixel: number): number {
  const index = getZoomLevelIndex(msPerPixel);
  return ZOOM_LEVELS[index].tickInterval;
}
