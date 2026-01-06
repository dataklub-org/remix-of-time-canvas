export type Category = 'business' | 'personal';

export interface Moment {
  id: string;
  timestamp: number; // Unix milliseconds - start time
  endTime?: number; // Unix milliseconds - end time (optional, defaults to timestamp)
  y: number; // Arbitrary vertical position
  description: string;
  people: string;
  location: string;
  category: Category;
  createdAt: number;
  updatedAt: number;
}

export interface CanvasState {
  centerTime: number; // Unix ms - what time is at center of screen
  msPerPixel: number; // Zoom level - smaller = more zoomed in
}
