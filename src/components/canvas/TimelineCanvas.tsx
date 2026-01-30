import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { Plus, MessageSquare } from 'lucide-react';
import { NotificationBubble } from './NotificationBubble';
import { useCanvasSize } from '@/hooks/useCanvasSize';
import { usePanZoom } from '@/hooks/usePanZoom';
import { useMomentsStore, OURLIFE_TIMELINE_ID, BABYLIFE_TIMELINE_ID } from '@/stores/useMomentsStore';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { useBabies } from '@/hooks/useBabies';
import { useIsMobile } from '@/hooks/use-mobile';
import { TimeAxis } from './TimeAxis';
import { MomentCard } from './MomentCard';
import { CreateMomentDialog } from './CreateMomentDialog';
import { EditMomentDialog } from './EditMomentDialog';
import { NavigationControls } from './NavigationControls';
import { FeedbackPopup } from './FeedbackPopup';
import { TimelineSelector } from './TimelineSelector';
import { AuthButton } from './AuthButton';
import { JumpToDateButton } from './JumpToDateButton';
import { MyCircle } from '@/components/circle/MyCircle';
import { xToTime, getZoomLevel } from '@/utils/timeUtils';
import { Button } from '@/components/ui/button';
import type { Moment } from '@/types/moment';
import fractalito from '@/assets/fractalito-logo.png';

const DEFAULT_CARD_HEIGHT = 56;
const PADDING = 100;
const DEFAULT_MS_PER_PIXEL = 36_000;

export function TimelineCanvas() {
  const { width, height: viewportHeight } = useCanvasSize();
  const { moments, groupMoments, babyMoments, canvasState, setAuthenticated } = useMomentsStore();
  const { user, isAuthenticated } = useAuth();
  const { groups } = useGroups(user?.id || null);
  const { babies } = useBabies(user?.id || null);
  const isMobile = useIsMobile();
  const { isPanning, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, setVerticalScrollHandler } = usePanZoom({ canvasWidth: width });
  const initialMsPerPixelRef = useRef(canvasState.msPerPixel);
  const [showVision, setShowVision] = useState(true);
  
  // Create a map of group ID to color for quick lookup
  const groupColorMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach(g => {
      if (g.color) {
        map.set(g.id, g.color);
      }
    });
    return map;
  }, [groups]);
  
  // Sync auth state with moments store
  useEffect(() => {
    setAuthenticated(isAuthenticated, user?.id || null);
  }, [isAuthenticated, user?.id, setAuthenticated]);
  
  // Determine which moments to show based on active timeline
  const isOurLifeActive = canvasState.activeTimelineId === OURLIFE_TIMELINE_ID;
  const isBabyLifeActive = canvasState.activeTimelineId === BABYLIFE_TIMELINE_ID;
  
  const activeTimelineMoments = useMemo(() => {
    if (isOurLifeActive) {
      // Show all group moments for OurLife
      return groupMoments;
    }
    if (isBabyLifeActive) {
      // Show all baby moments for BabyLife
      return babyMoments;
    }
    // For MyLife, show user's personal moments
    return moments;
  }, [moments, groupMoments, babyMoments, isOurLifeActive, isBabyLifeActive]);
  
  // Calculate dynamic canvas height based on moment positions
  // On mobile, push timeline higher by adjusting the baseline
  // Push timeline to 1/3 from bottom on mobile (2/3 from top)
  const mobileTimelineOffset = isMobile ? (viewportHeight / 3) - (viewportHeight / 2) : 0;
  
  const { canvasHeight, timelineY, scrollOffset } = useMemo(() => {
    if (activeTimelineMoments.length === 0) {
      const baseTimelineY = viewportHeight / 2 + mobileTimelineOffset;
      return { canvasHeight: viewportHeight, timelineY: baseTimelineY, scrollOffset: 0 };
    }
    
    let minY = Infinity;
    let maxY = -Infinity;
    
    activeTimelineMoments.forEach(m => {
      const cardHeight = m.height || DEFAULT_CARD_HEIGHT;
      minY = Math.min(minY, m.y);
      maxY = Math.max(maxY, m.y + cardHeight);
    });
    
    // Calculate required height with padding
    const requiredHeight = Math.max(viewportHeight, maxY - minY + PADDING * 2);
    
    // Keep timeline centered in viewport (with mobile offset), but allow scrolling
    const timelinePos = viewportHeight / 2 + mobileTimelineOffset;
    
    // Calculate how much we need to scroll to show all content
    const contentTop = Math.min(0, minY - PADDING);
    const contentBottom = Math.max(viewportHeight, maxY + PADDING);
    const totalHeight = contentBottom - contentTop;
    
    return { 
      canvasHeight: Math.max(viewportHeight, totalHeight), 
      timelineY: timelinePos - contentTop,
      scrollOffset: contentTop
    };
  }, [activeTimelineMoments, viewportHeight, mobileTimelineOffset]);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPosition, setCreatePosition] = useState({ timestamp: Date.now(), y: 0 });
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [myCircleOpen, setMyCircleOpen] = useState(false);
  const [babiesSectionExpanded, setBabiesSectionExpanded] = useState(false);

  // Handler to open MyCircle with Babies section expanded
  const handleOpenBabiesSection = useCallback(() => {
    setBabiesSectionExpanded(true);
    setMyCircleOpen(true);
  }, []);

  // Reset babies expanded state when MyCircle closes
  const handleMyCircleOpenChange = useCallback((open: boolean) => {
    setMyCircleOpen(open);
    if (!open) {
      setBabiesSectionExpanded(false);
    }
  }, []);

  // Register vertical scroll handler for touch panning
  useEffect(() => {
    setVerticalScrollHandler((deltaY: number) => {
      setScrollY(prev => {
        const newScroll = prev + deltaY;
        const maxScroll = Math.max(0, canvasHeight - viewportHeight);
        return Math.max(0, Math.min(maxScroll, newScroll));
      });
    });
  }, [setVerticalScrollHandler, canvasHeight, viewportHeight]);

  // Hide vision text when zoom changes from initial
  useEffect(() => {
    if (canvasState.msPerPixel !== initialMsPerPixelRef.current) {
      setShowVision(false);
    }
  }, [canvasState.msPerPixel]);

  const handleCanvasClick = useCallback((e: any) => {
    // Only create on double-click to avoid accidental creation
    if (e.evt.detail !== 2) return;
    
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    if (!pointerPos) return;
    
    const timestamp = xToTime(pointerPos.x, canvasState.centerTime, canvasState.msPerPixel, width);
    const y = pointerPos.y + scrollOffset;
    
    setCreatePosition({ timestamp, y });
    setCreateDialogOpen(true);
  }, [canvasState, width, scrollOffset]);

  const handleSelectMoment = useCallback((moment: Moment) => {
    setSelectedMoment(moment);
  }, []);

  const handleAddMoment = useCallback(() => {
    // Capture timestamp at the moment user clicks "Add Moment"
    const capturedTimestamp = Date.now();
    // Position moment slightly above timeline center (60px above)
    setCreatePosition({ timestamp: capturedTimestamp, y: (viewportHeight / 2) - 60 });
    setCreateDialogOpen(true);
  }, [viewportHeight]);

  const handleVerticalScroll = useCallback((e: React.WheelEvent) => {
    if (e.shiftKey) {
      // Shift+scroll for vertical panning
      setScrollY(prev => {
        const newScroll = prev + e.deltaY;
        const maxScroll = Math.max(0, canvasHeight - viewportHeight);
        return Math.max(0, Math.min(maxScroll, newScroll));
      });
      e.preventDefault();
    }
  }, [canvasHeight, viewportHeight]);

  return (
    <div 
      className="w-full h-full bg-[hsl(var(--canvas-bg))] overflow-hidden"
      onMouseDown={handleMouseDown as any}
      onMouseMove={handleMouseMove as any}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown as any}
      onTouchMove={handleMouseMove as any}
      onTouchEnd={handleMouseUp}
      onWheel={(e) => {
        // If a modal is open, let the modal consume scrolling (don't pan/zoom the canvas)
        if (createDialogOpen || !!selectedMoment || feedbackOpen) return;
        if (e.shiftKey) {
          handleVerticalScroll(e);
        } else {
          handleWheel(e as any);
        }
      }}
    >
      <Stage 
        width={width} 
        height={canvasHeight}
        onClick={handleCanvasClick}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
        y={-scrollOffset}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={scrollOffset}
            width={width}
            height={canvasHeight}
            fill="transparent"
          />
          
          {/* Time axis */}
          <TimeAxis width={width} height={canvasHeight} timelineY={timelineY + scrollOffset} />
          
          {/* Moment cards - filter by memorable on weekly/monthly/yearly views only */}
          {activeTimelineMoments
            .filter((moment) => {
              const zoomLevel = getZoomLevel(canvasState.msPerPixel);
              // Only filter at week/month/year - show all moments at 6h and 1d levels
              if (zoomLevel === 'week' || zoomLevel === 'month' || zoomLevel === 'year') {
                return moment.memorable === true;
              }
              return true;
            })
            .map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                canvasWidth={width}
                canvasHeight={canvasHeight}
                onSelect={handleSelectMoment}
                timelineY={timelineY + scrollOffset}
                isGroupMoment={isOurLifeActive}
                isBabyMoment={isBabyLifeActive}
                groupColor={moment.groupId ? groupColorMap.get(moment.groupId) : undefined}
              />
            ))}
        </Layer>
      </Stage>
      
      {/* Navigation controls */}
      <NavigationControls />
      
      {/* Branding logo & Notification - top left */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <img src={fractalito} alt="fractalito" className="h-5 w-auto" />
        <NotificationBubble />
      </div>
      
      {/* Auth button & My Circle - top right */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <MyCircle 
          externalOpen={myCircleOpen} 
          onExternalOpenChange={handleMyCircleOpenChange}
          defaultBabiesExpanded={babiesSectionExpanded}
        />
        <AuthButton />
      </div>
      
      {/* Feedback button - bottom left */}
      <Button
        onClick={() => setFeedbackOpen(true)}
        className="absolute bottom-20 md:bottom-4 left-4 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white z-10"
        size="sm"
      >
        <MessageSquare className="h-4 w-4 mr-1.5" />
        Feedback
      </Button>
      
      {/* Feedback popup */}
      <FeedbackPopup open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      
      {/* Jump to Date button - above Add moment on right */}
      <div className="absolute right-4 bottom-32 md:bottom-16 flex flex-col gap-2 z-10">
        <JumpToDateButton />
      </div>
      
      {/* Add moment button - bottom right */}
      <Button
        onClick={handleAddMoment}
        className="absolute right-4 bottom-20 md:bottom-4 rounded-full shadow-lg z-10"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Moment
      </Button>
      
      {/* Timeline selector - centered, below logo/feedback */}
      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-10">
        <TimelineSelector onOpenBabiesSection={handleOpenBabiesSection} />
      </div>
      
      {/* Vision statement - centered between selector and timeline, hidden when logged in */}
      {showVision && !isAuthenticated && (
        <div className="absolute top-24 left-0 right-0 text-center pointer-events-none select-none px-6 z-0">
          <p className="text-base md:text-2xl font-semibold text-foreground tracking-tight mb-1">
            A visual memory plane
          </p>
          <p className="text-sm md:text-lg italic text-foreground/80 tracking-wide mb-1">
            Time flows horizontally, moments live in space
          </p>
          <p className="text-xs md:text-sm font-normal text-muted-foreground max-w-md mx-auto leading-relaxed hidden md:block">
            Capture thoughts, experiences, and ideas as points on a timeline—organized by categories, enhanced by meaning and proximity
          </p>
        </div>
      )}
      
      {/* Create dialog */}
      <CreateMomentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        timestamp={createPosition.timestamp}
        y={createPosition.y}
      />
      
      {/* Edit dialog */}
      <EditMomentDialog
        moment={selectedMoment}
        onClose={() => setSelectedMoment(null)}
      />
    </div>
  );
}
