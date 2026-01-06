export type Category = 'business' | 'personal';

export interface Moment {
  id: string;
  timestamp: number; // Unix milliseconds
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
