import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMomentsStore, DEFAULT_TIMELINE_ID, OURLIFE_TIMELINE_ID, BABYLIFE_TIMELINE_ID } from '@/stores/useMomentsStore';
import { useAuth } from '@/hooks/useAuth';
import { useBabies } from '@/hooks/useBabies';

export function TimelineSelector() {
  const navigate = useNavigate();
  const { canvasState, setActiveTimeline } = useMomentsStore();
  const { isAuthenticated, user } = useAuth();
  const { babies } = useBabies(user?.id || null);
  
  const isMyLifeActive = canvasState.activeTimelineId === DEFAULT_TIMELINE_ID;
  const isOurLifeActive = canvasState.activeTimelineId === OURLIFE_TIMELINE_ID;
  const isBabyLifeActive = canvasState.activeTimelineId === BABYLIFE_TIMELINE_ID;
  
  const handleTimelineSelect = (timelineId: string) => {
    // OurLife and BabyLife require authentication
    if ((timelineId === OURLIFE_TIMELINE_ID || timelineId === BABYLIFE_TIMELINE_ID) && !isAuthenticated) {
      navigate('/auth');
      return;
    }
    setActiveTimeline(timelineId);
  };

  // Only show BabyLife tab if user has babies
  const showBabyLife = isAuthenticated && babies.length > 0;

  return (
    <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-1 py-1 shadow-sm border border-border/50">
      {/* MyLife tab */}
      <button
        onClick={() => handleTimelineSelect(DEFAULT_TIMELINE_ID)}
        className={cn(
          "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          isMyLifeActive
            ? "bg-black text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        MyLife
      </button>
      
      {/* OurLife tab */}
      <button
        onClick={() => handleTimelineSelect(OURLIFE_TIMELINE_ID)}
        className={cn(
          "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          isOurLifeActive
            ? "bg-black text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        OurLife
      </button>

      {/* BabyLife tab - only shown when user has babies */}
      {showBabyLife && (
        <button
          onClick={() => handleTimelineSelect(BABYLIFE_TIMELINE_ID)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
            isBabyLifeActive
              ? "bg-black text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          BabyLife
        </button>
      )}
    </div>
  );
}
