// Time-to-coordinate conversion utilities

export function timeToX(timestamp: number, centerTime: number, msPerPixel: number, canvasWidth: number): number {
  const centerX = canvasWidth / 2;
  return centerX + (timestamp - centerTime) / msPerPixel;
}

export function xToTime(x: number, centerTime: number, msPerPixel: number, canvasWidth: number): number {
  const centerX = canvasWidth / 2;
  return centerTime + (x - centerX) * msPerPixel;
}

// Zoom level presets
export const ZOOM_LEVELS = {
  minutes: 60_000,      // 1 min/px - very zoomed in
  hours: 3_600_000,     // 1 hour/px
  days: 86_400_000,     // 1 day/px
  weeks: 604_800_000,   // 1 week/px
} as const;

export const MIN_MS_PER_PIXEL = 1_000;        // 1 second/px (max zoom in)
export const MAX_MS_PER_PIXEL = 604_800_000;  // 1 week/px (max zoom out)

export function clampZoom(msPerPixel: number): number {
  return Math.max(MIN_MS_PER_PIXEL, Math.min(MAX_MS_PER_PIXEL, msPerPixel));
}

// Get appropriate time unit for current zoom level
export function getTimeUnit(msPerPixel: number): 'second' | 'minute' | 'hour' | 'day' | 'week' {
  if (msPerPixel < 10_000) return 'second';
  if (msPerPixel < 600_000) return 'minute';
  if (msPerPixel < 36_000_000) return 'hour';
  if (msPerPixel < 302_400_000) return 'day';
  return 'week';
}

// Generate tick intervals based on zoom level
export function getTickInterval(msPerPixel: number): number {
  const unit = getTimeUnit(msPerPixel);
  switch (unit) {
    case 'second': return 10_000; // 10 seconds
    case 'minute': return 300_000; // 5 minutes
    case 'hour': return 3_600_000; // 1 hour
    case 'day': return 86_400_000; // 1 day
    case 'week': return 604_800_000; // 1 week
  }
}
