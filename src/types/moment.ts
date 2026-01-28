export type Category = 'business' | 'personal';

export type TimelineType = 'mylife' | 'ourlife';

export interface Timeline {
  id: string;
  name: string;
  type: TimelineType;
  isDefault?: boolean;
}

export interface Moment {
  id: string;
  timelineId: string; // Which timeline this moment belongs to
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
  photo?: string; // Photo URL or base64 data
  createdAt: number;
  updatedAt: number;
  groupId?: string; // For group moments, the group this moment belongs to
}

export interface CanvasState {
  centerTime: number; // Unix ms - what time is at center of screen
  msPerPixel: number; // Zoom level - smaller = more zoomed in
  activeTimelineId: string; // Currently selected timeline
}
