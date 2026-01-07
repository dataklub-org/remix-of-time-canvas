import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Moment, Category, CanvasState, Timeline } from '@/types/moment';

const DEFAULT_TIMELINE_ID = 'mylife';
const OURLIFE_TIMELINE_ID = 'ourlife';

const DEFAULT_TIMELINES: Timeline[] = [
  { id: DEFAULT_TIMELINE_ID, name: 'MyLife', type: 'mylife', isDefault: true },
  { id: OURLIFE_TIMELINE_ID, name: 'OurLife', type: 'ourlife' },
];

interface MomentsStore {
  moments: Moment[];
  timelines: Timeline[];
  canvasState: CanvasState;
  
  // Moment actions
  addMoment: (moment: Omit<Moment, 'id' | 'createdAt' | 'updatedAt' | 'timelineId'>) => void;
  updateMoment: (id: string, updates: Partial<Omit<Moment, 'id' | 'createdAt'>>) => void;
  deleteMoment: (id: string) => void;
  updateMomentY: (id: string, y: number) => void;
  updateMomentSize: (id: string, width: number, height: number) => void;
  
  // Timeline actions
  setActiveTimeline: (timelineId: string) => void;
  addTimeline: (timeline: Omit<Timeline, 'id'>) => void;
  
  // Canvas actions
  setCenterTime: (time: number) => void;
  setMsPerPixel: (msPerPixel: number) => void;
  jumpToNow: () => void;
}

const DEFAULT_MS_PER_PIXEL = 36_000; // 1 hour per pixel (hourly view)

export const useMomentsStore = create<MomentsStore>()(
  persist(
    (set, get) => ({
      moments: [],
      timelines: DEFAULT_TIMELINES,
      canvasState: {
        centerTime: Date.now(),
        msPerPixel: DEFAULT_MS_PER_PIXEL,
        activeTimelineId: DEFAULT_TIMELINE_ID,
      },

      addMoment: (moment) => {
        const now = Date.now();
        const { activeTimelineId } = get().canvasState;
        set((state) => ({
          moments: [
            ...state.moments,
            {
              ...moment,
              id: nanoid(),
              timelineId: activeTimelineId,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
      },

      updateMoment: (id, updates) => {
        set((state) => ({
          moments: state.moments.map((m) =>
            m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
          ),
        }));
      },

      deleteMoment: (id) => {
        set((state) => ({
          moments: state.moments.filter((m) => m.id !== id),
        }));
      },

      updateMomentY: (id, y) => {
        set((state) => ({
          moments: state.moments.map((m) =>
            m.id === id ? { ...m, y, updatedAt: Date.now() } : m
          ),
        }));
      },

      updateMomentSize: (id, width, height) => {
        set((state) => ({
          moments: state.moments.map((m) =>
            m.id === id ? { ...m, width, height, updatedAt: Date.now() } : m
          ),
        }));
      },

      setActiveTimeline: (timelineId) => {
        set((state) => ({
          canvasState: { ...state.canvasState, activeTimelineId: timelineId },
        }));
      },

      addTimeline: (timeline) => {
        set((state) => ({
          timelines: [...state.timelines, { ...timeline, id: nanoid() }],
        }));
      },

      setCenterTime: (time) => {
        set((state) => ({
          canvasState: { ...state.canvasState, centerTime: time },
        }));
      },

      setMsPerPixel: (msPerPixel) => {
        set((state) => ({
          canvasState: { ...state.canvasState, msPerPixel },
        }));
      },

      jumpToNow: () => {
        set((state) => ({
          canvasState: { ...state.canvasState, centerTime: Date.now(), msPerPixel: 36_000 },
        }));
      },
    }),
    {
      name: 'temporal-memory-storage',
      // Migration to add timelineId to existing moments
      migrate: (persistedState: any, version: number) => {
        if (persistedState.moments) {
          persistedState.moments = persistedState.moments.map((m: any) => ({
            ...m,
            timelineId: m.timelineId || DEFAULT_TIMELINE_ID,
          }));
        }
        if (!persistedState.timelines) {
          persistedState.timelines = DEFAULT_TIMELINES;
        }
        if (persistedState.canvasState && !persistedState.canvasState.activeTimelineId) {
          persistedState.canvasState.activeTimelineId = DEFAULT_TIMELINE_ID;
        }
        return persistedState;
      },
      version: 1,
    }
  )
);
