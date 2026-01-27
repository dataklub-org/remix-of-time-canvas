import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const DEFAULT_TIMELINE_ID = 'mylife';
const OURLIFE_TIMELINE_ID = 'ourlife';

export function TimelineSelector() {
  const navigate = useNavigate();
  const { canvasState, timelines, setActiveTimeline } = useMomentsStore();
  const { isAuthenticated } = useAuth();
  const [proDialogOpen, setProDialogOpen] = useState(false);
  
  const activeTimeline = timelines.find(t => t.id === canvasState.activeTimelineId) || timelines[0];
  const ourLifeTimelines = timelines.filter(t => t.type === 'ourlife');
  const hasMultipleOurLife = ourLifeTimelines.length > 1;
  
  const handleTimelineSelect = (timelineId: string) => {
    // If selecting OurLife, check auth first then show Pro dialog
    if (timelineId !== DEFAULT_TIMELINE_ID) {
      if (!isAuthenticated) {
        navigate('/auth');
        return;
      }
      setProDialogOpen(true);
      return;
    }
    setActiveTimeline(timelineId);
  };

  const handleUpgradeToPro = () => {
    setProDialogOpen(false);
    if (!isAuthenticated) {
      navigate('/auth');
    }
    // TODO: Implement Pro upgrade flow
  };

  return (
    <>
      <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-1 py-1 shadow-sm border border-border/50">
        {/* MyLife tab */}
        <button
          onClick={() => handleTimelineSelect(DEFAULT_TIMELINE_ID)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
            canvasState.activeTimelineId === DEFAULT_TIMELINE_ID
              ? "bg-foreground text-background shadow-sm"
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
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 relative",
                  canvasState.activeTimelineId !== DEFAULT_TIMELINE_ID
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                OurLife
                <ChevronDown className="h-3.5 w-3.5" />
                <Lock className="h-3 w-3 absolute -top-1 -right-1 text-amber-500" />
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
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 relative",
              canvasState.activeTimelineId === OURLIFE_TIMELINE_ID
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            OurLife
            <Lock className="h-3 w-3 text-amber-500" />
          </button>
        )}
      </div>
      
      {/* Pro Feature Dialog */}
      <Dialog open={proDialogOpen} onOpenChange={setProDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              OurLife is a Pro Feature
            </DialogTitle>
            <DialogDescription className="pt-2">
              Share timelines with family, friends, or teams. Create shared memories together and see moments from everyone in one unified view.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/50">
              <h4 className="font-semibold text-foreground mb-2">What you get with Pro:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unlimited shared timelines
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Invite family & friends
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Real-time collaboration
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Advanced privacy controls
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Original photo size
                </li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setProDialogOpen(false)}
              >
                Maybe Later
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={handleUpgradeToPro}
              >
                {isAuthenticated ? 'Upgrade to Pro' : 'Sign In to Upgrade'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
