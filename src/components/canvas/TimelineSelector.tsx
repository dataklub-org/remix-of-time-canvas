import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DEFAULT_TIMELINE_ID = 'mylife';
const OURLIFE_TIMELINE_ID = 'ourlife';

export function TimelineSelector() {
  const navigate = useNavigate();
  const { canvasState, timelines, setActiveTimeline } = useMomentsStore();
  const { isAuthenticated } = useAuth();
  
  const activeTimeline = timelines.find(t => t.id === canvasState.activeTimelineId) || timelines[0];
  const ourLifeTimelines = timelines.filter(t => t.type === 'ourlife');
  const hasMultipleOurLife = ourLifeTimelines.length > 1;
  
  const handleTimelineSelect = (timelineId: string) => {
    // OurLife requires authentication
    if (timelineId !== DEFAULT_TIMELINE_ID && !isAuthenticated) {
      navigate('/auth');
      return;
    }
    setActiveTimeline(timelineId);
  };

  return (
    <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-1 py-1 shadow-sm border border-border/50">
      {/* MyLife tab */}
      <button
        onClick={() => handleTimelineSelect(DEFAULT_TIMELINE_ID)}
        className={cn(
          "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          canvasState.activeTimelineId === DEFAULT_TIMELINE_ID
            ? "bg-black text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        MyLife
      </button>
      
      {/* OurLife tab - with dropdown if multiple groups */}
      {hasMultipleOurLife ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                canvasState.activeTimelineId !== DEFAULT_TIMELINE_ID
                  ? "bg-black text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              OurLife
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[140px] bg-popover z-50">
            {ourLifeTimelines.map((timeline) => (
              <DropdownMenuItem
                key={timeline.id}
                onClick={() => handleTimelineSelect(timeline.id)}
                className="cursor-pointer"
              >
                {timeline.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          onClick={() => handleTimelineSelect(OURLIFE_TIMELINE_ID)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
            canvasState.activeTimelineId === OURLIFE_TIMELINE_ID
              ? "bg-black text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          OurLife
        </button>
      )}
    </div>
  );
}
