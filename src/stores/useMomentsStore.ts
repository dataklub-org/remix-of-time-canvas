import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Moment, Category, CanvasState } from '@/types/moment';

interface MomentsStore {
  moments: Moment[];
  canvasState: CanvasState;
  
  // Moment actions
  addMoment: (moment: Omit<Moment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMoment: (id: string, updates: Partial<Omit<Moment, 'id' | 'createdAt'>>) => void;
  deleteMoment: (id: string) => void;
  updateMomentY: (id: string, y: number) => void;
  updateMomentSize: (id: string, width: number, height: number) => void;
  
  // Canvas actions
  setCenterTime: (time: number) => void;
  setMsPerPixel: (msPerPixel: number) => void;
  jumpToNow: () => void;
}

const DEFAULT_MS_PER_PIXEL = 60_000; // 1 minute per pixel

export const useMomentsStore = create<MomentsStore>()(
  persist(
    (set) => ({
      moments: [],
      canvasState: {
        centerTime: Date.now(),
        msPerPixel: DEFAULT_MS_PER_PIXEL,
      },

      addMoment: (moment) => {
        const now = Date.now();
        set((state) => ({
          moments: [
            ...state.moments,
            {
              ...moment,
              id: nanoid(),
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
          canvasState: { ...state.canvasState, centerTime: Date.now() },
        }));
      },
    }),
    {
      name: 'temporal-memory-storage',
    }
  )
);
