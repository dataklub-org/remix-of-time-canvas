export type Category = 'business' | 'personal';

export interface Moment {
  id: string;
  timestamp: number; // Unix milliseconds - start time
  endTime?: number; // Unix milliseconds - end time (optional, defaults to timestamp)
  y: number; // Arbitrary vertical position
  width?: number; // Card width (optional, defaults to 180)
  height?: number; // Card height (optional, defaults to 70)
  description: string;
  people: string;
  location: string;
  category: Category;
  memorable?: boolean; // Whether this is a Memorable Moment (shown on monthly/yearly view)
  createdAt: number;
  updatedAt: number;
}

export interface CanvasState {
  centerTime: number; // Unix ms - what time is at center of screen
  msPerPixel: number; // Zoom level - smaller = more zoomed in
}
