import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Moment, Category, CanvasState, Timeline } from '@/types/moment';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_TIMELINE_ID = 'mylife';
const OURLIFE_TIMELINE_ID = 'ourlife';

const DEFAULT_TIMELINES: Timeline[] = [
  { id: DEFAULT_TIMELINE_ID, name: 'MyLife', type: 'mylife', isDefault: true },
  { id: OURLIFE_TIMELINE_ID, name: 'OurLife', type: 'ourlife' },
];

interface MomentsStore {
  moments: Moment[];
  groupMoments: Moment[]; // Moments from all groups user belongs to
  timelines: Timeline[];
  canvasState: CanvasState;
  isAuthenticated: boolean;
  userId: string | null;
  userTimelineId: string | null; // The user's actual timeline ID from Supabase
  isLoading: boolean;
  
  // Auth actions
  setAuthenticated: (isAuth: boolean, userId: string | null) => void;
  loadUserData: () => Promise<void>;
  loadGroupMoments: () => Promise<void>;
  clearUserData: () => void;
  
  // Moment actions
  addMoment: (moment: Omit<Moment, 'id' | 'createdAt' | 'updatedAt' | 'timelineId'>) => Promise<void>;
  addGroupMoment: (groupId: string, moment: Omit<Moment, 'id' | 'createdAt' | 'updatedAt' | 'timelineId'>) => Promise<void>;
  updateMoment: (id: string, updates: Partial<Omit<Moment, 'id' | 'createdAt'>>) => Promise<void>;
  deleteMoment: (id: string) => Promise<void>;
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

// Helper to convert Supabase moment to local Moment type
function supabaseMomentToLocal(row: any): Moment {
  return {
    id: row.id,
    timelineId: row.timeline_id,
    timestamp: row.start_time,
    endTime: row.end_time || undefined,
    y: row.y_position,
    width: row.width || undefined,
    height: row.height || undefined,
    description: row.description,
    people: row.people || '',
    location: row.location || '',
    category: row.category as Category,
    memorable: row.memorable || false,
    photo: row.photo_url || undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

// Helper to convert group_moment row to local Moment type
function groupMomentToLocal(row: any): Moment {
  return {
    id: row.id,
    timelineId: OURLIFE_TIMELINE_ID, // All group moments belong to OurLife
    timestamp: row.start_time,
    endTime: row.end_time || undefined,
    y: row.y_position,
    width: row.width || undefined,
    height: row.height || undefined,
    description: row.description,
    people: row.people || '',
    location: row.location || '',
    category: row.category as Category,
    memorable: row.memorable || false,
    photo: row.photo_url || undefined,
    createdAt: new Date(row.shared_at).getTime(),
    updatedAt: new Date(row.shared_at).getTime(),
  };
}

export const useMomentsStore = create<MomentsStore>()(
  persist(
    (set, get) => ({
      moments: [],
      groupMoments: [],
      timelines: DEFAULT_TIMELINES,
      canvasState: {
        centerTime: Date.now(),
        msPerPixel: DEFAULT_MS_PER_PIXEL,
        activeTimelineId: DEFAULT_TIMELINE_ID,
      },
      isAuthenticated: false,
      userId: null,
      userTimelineId: null,
      isLoading: false,

      setAuthenticated: (isAuth, userId) => {
        set({ isAuthenticated: isAuth, userId });
        if (isAuth && userId) {
          get().loadUserData();
          get().loadGroupMoments();
        } else {
          get().clearUserData();
        }
      },

      loadUserData: async () => {
        const { userId } = get();
        if (!userId) return;
        
        set({ isLoading: true });
        
        try {
          // Get user's default timeline
          const { data: timelines, error: timelineError } = await supabase
            .from('timelines')
            .select('*')
            .eq('user_id', userId)
            .eq('is_default', true)
            .maybeSingle();
          
          if (timelineError) throw timelineError;
          
          const userTimelineId = timelines?.id || null;
          
          if (userTimelineId) {
            // Load moments for this timeline
            const { data: moments, error: momentsError } = await supabase
              .from('moments')
              .select('*')
              .eq('timeline_id', userTimelineId)
              .order('start_time', { ascending: false });
            
            if (momentsError) throw momentsError;
            
            const localMoments = (moments || []).map(supabaseMomentToLocal);
            
            set({ 
              moments: localMoments, 
              userTimelineId,
              canvasState: {
                ...get().canvasState,
                activeTimelineId: DEFAULT_TIMELINE_ID, // Start on MyLife
              }
            });
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadGroupMoments: async () => {
        const { userId } = get();
        if (!userId) return;

        try {
          // Get all groups user is a member of
          const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('id');

          if (groupsError) throw groupsError;
          if (!groups || groups.length === 0) {
            set({ groupMoments: [] });
            return;
          }

          const groupIds = groups.map(g => g.id);

          // Fetch all moments from those groups
          const { data: gMoments, error: momentsError } = await supabase
            .from('group_moments')
            .select('*')
            .in('group_id', groupIds)
            .order('start_time', { ascending: false });

          if (momentsError) throw momentsError;

          const localGroupMoments = (gMoments || []).map(groupMomentToLocal);
          set({ groupMoments: localGroupMoments });
        } catch (error) {
          console.error('Error loading group moments:', error);
        }
      },

      clearUserData: () => {
        set({ 
          moments: [], 
          groupMoments: [],
          userId: null, 
          userTimelineId: null,
          isAuthenticated: false,
          canvasState: {
            centerTime: Date.now(),
            msPerPixel: DEFAULT_MS_PER_PIXEL,
            activeTimelineId: DEFAULT_TIMELINE_ID,
          }
        });
      },

      addMoment: async (moment) => {
        const now = Date.now();
        const { isAuthenticated, userId, userTimelineId } = get();
        
        if (isAuthenticated && userId && userTimelineId) {
          // Save to Supabase
          try {
            const { data, error } = await supabase
              .from('moments')
              .insert({
                user_id: userId,
                timeline_id: userTimelineId,
                start_time: moment.timestamp,
                end_time: moment.endTime || null,
                y_position: moment.y,
                description: moment.description,
                people: moment.people || null,
                location: moment.location || null,
                category: moment.category,
                memorable: moment.memorable || false,
                photo_url: moment.photo || null,
                width: moment.width || null,
                height: moment.height || null,
              })
              .select()
              .single();
            
            if (error) throw error;
            
            const newMoment = supabaseMomentToLocal(data);
            set((state) => ({
              moments: [...state.moments, newMoment],
            }));
          } catch (error) {
            console.error('Error adding moment:', error);
          }
        } else {
          // Local-only storage
          set((state) => ({
            moments: [
              ...state.moments,
              {
                ...moment,
                id: nanoid(),
                timelineId: DEFAULT_TIMELINE_ID,
                createdAt: now,
                updatedAt: now,
              },
            ],
          }));
        }
      },

      addGroupMoment: async (groupId, moment) => {
        const { userId } = get();
        if (!userId) return;

        try {
          const { data, error } = await supabase
            .from('group_moments')
            .insert({
              group_id: groupId,
              shared_by: userId,
              start_time: moment.timestamp,
              end_time: moment.endTime || null,
              y_position: moment.y,
              description: moment.description,
              people: moment.people || null,
              location: moment.location || null,
              category: moment.category,
              memorable: moment.memorable || false,
              photo_url: moment.photo || null,
              width: moment.width || null,
              height: moment.height || null,
            })
            .select()
            .single();

          if (error) throw error;

          const newGroupMoment = groupMomentToLocal(data);
          set((state) => ({
            groupMoments: [...state.groupMoments, newGroupMoment],
          }));
        } catch (error) {
          console.error('Error adding group moment:', error);
        }
      },

      updateMoment: async (id, updates) => {
        const { isAuthenticated, userId } = get();
        
        if (isAuthenticated && userId) {
          // Update in Supabase
          try {
            const supabaseUpdates: any = {
              updated_at: new Date().toISOString(),
            };
            
            if (updates.timestamp !== undefined) supabaseUpdates.start_time = updates.timestamp;
            if (updates.endTime !== undefined) supabaseUpdates.end_time = updates.endTime || null;
            if (updates.y !== undefined) supabaseUpdates.y_position = updates.y;
            if (updates.description !== undefined) supabaseUpdates.description = updates.description;
            if (updates.people !== undefined) supabaseUpdates.people = updates.people || null;
            if (updates.location !== undefined) supabaseUpdates.location = updates.location || null;
            if (updates.category !== undefined) supabaseUpdates.category = updates.category;
            if (updates.memorable !== undefined) supabaseUpdates.memorable = updates.memorable;
            if (updates.photo !== undefined) supabaseUpdates.photo_url = updates.photo || null;
            if (updates.width !== undefined) supabaseUpdates.width = updates.width;
            if (updates.height !== undefined) supabaseUpdates.height = updates.height;
            
            const { error } = await supabase
              .from('moments')
              .update(supabaseUpdates)
              .eq('id', id)
              .eq('user_id', userId);
            
            if (error) throw error;
            
            set((state) => ({
              moments: state.moments.map((m) =>
                m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
              ),
            }));
          } catch (error) {
            console.error('Error updating moment:', error);
          }
        } else {
          // Local-only update
          set((state) => ({
            moments: state.moments.map((m) =>
              m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
            ),
          }));
        }
      },

      deleteMoment: async (id) => {
        const { isAuthenticated, userId } = get();
        
        if (isAuthenticated && userId) {
          // Delete from Supabase
          try {
            const { error } = await supabase
              .from('moments')
              .delete()
              .eq('id', id)
              .eq('user_id', userId);
            
            if (error) throw error;
            
            set((state) => ({
              moments: state.moments.filter((m) => m.id !== id),
            }));
          } catch (error) {
            console.error('Error deleting moment:', error);
          }
        } else {
          // Local-only delete
          set((state) => ({
            moments: state.moments.filter((m) => m.id !== id),
          }));
        }
      },

      updateMomentY: (id, y) => {
        const state = get();
        const movingMoment = state.moments.find((m) => m.id === id);
        if (!movingMoment) return;

        const movingHeight = movingMoment.height || 56;
        const newTop = y;
        const newBottom = y + movingHeight;
        
        // Find overlapping moments in the same timeline (within similar time range)
        const PUSH_MARGIN = 4; // Gap between pushed moments
        const TIME_OVERLAP_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours overlap window
        
        // Track which moments need Y position updates for Supabase sync
        const momentsToSync: { id: string; y: number }[] = [{ id, y }];
        
        let updatedMoments = state.moments.map((m) => {
          if (m.id === id) {
            return { ...m, y, updatedAt: Date.now() };
          }
          
          // Only push moments in same timeline
          if (m.timelineId !== movingMoment.timelineId) return m;
          
          // Check if moments overlap in time
          const timeOverlap = Math.abs(m.timestamp - movingMoment.timestamp) < TIME_OVERLAP_THRESHOLD;
          if (!timeOverlap) return m;
          
          const otherHeight = m.height || 56;
          const otherTop = m.y;
          const otherBottom = m.y + otherHeight;
          
          // Check vertical overlap
          const verticalOverlap = !(newBottom <= otherTop || newTop >= otherBottom);
          
          if (verticalOverlap) {
            // Push the other moment out of the way
            // Determine direction: push up if moving moment is coming from above, down otherwise
            const pushUp = newTop < otherTop;
            const newOtherY = pushUp 
              ? newBottom + PUSH_MARGIN 
              : newTop - otherHeight - PUSH_MARGIN;
            
            // Track pushed moment for Supabase sync
            momentsToSync.push({ id: m.id, y: newOtherY });
            
            return { ...m, y: newOtherY, updatedAt: Date.now() };
          }
          
          return m;
        });
        
        set({ moments: updatedMoments });
        
        // Sync Y position updates to Supabase if authenticated
        const { isAuthenticated, userId } = get();
        if (isAuthenticated && userId) {
          // Batch update all affected moments
          momentsToSync.forEach(async ({ id: momentId, y: newY }) => {
            try {
              await supabase
                .from('moments')
                .update({ 
                  y_position: newY,
                  updated_at: new Date().toISOString()
                })
                .eq('id', momentId)
                .eq('user_id', userId);
            } catch (error) {
              console.error('Error syncing Y position:', error);
            }
          });
        }
      },

      updateMomentSize: (id, width, height) => {
        set((state) => ({
          moments: state.moments.map((m) =>
            m.id === id ? { ...m, width, height, updatedAt: Date.now() } : m
          ),
        }));
        
        // Sync size to Supabase if authenticated
        const { isAuthenticated, userId } = get();
        if (isAuthenticated && userId) {
          supabase
            .from('moments')
            .update({ 
              width,
              height,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', userId)
            .then(({ error }) => {
              if (error) console.error('Error syncing size:', error);
            });
        }
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
      partialize: (state) => {
        // Only persist local data when NOT authenticated
        if (state.isAuthenticated) {
          return {
            canvasState: state.canvasState,
            timelines: state.timelines,
          };
        }
        return {
          moments: state.moments,
          canvasState: state.canvasState,
          timelines: state.timelines,
        };
      },
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

export { DEFAULT_TIMELINE_ID, OURLIFE_TIMELINE_ID };
