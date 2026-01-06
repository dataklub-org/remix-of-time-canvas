import { useState, useCallback, useMemo, useEffect } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { Plus, MessageSquare } from 'lucide-react';
import { useCanvasSize } from '@/hooks/useCanvasSize';
import { usePanZoom } from '@/hooks/usePanZoom';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { TimeAxis } from './TimeAxis';
import { MomentCard } from './MomentCard';
import { CreateMomentDialog } from './CreateMomentDialog';
import { EditMomentDialog } from './EditMomentDialog';
import { NavigationControls } from './NavigationControls';
import { FeedbackPopup } from './FeedbackPopup';
import { xToTime, getZoomLevel } from '@/utils/timeUtils';
import { Button } from '@/components/ui/button';
import type { Moment } from '@/types/moment';

const DEFAULT_CARD_HEIGHT = 56;
const PADDING = 100;

export function TimelineCanvas() {
  const { width, height: viewportHeight } = useCanvasSize();
  const { moments, canvasState } = useMomentsStore();
  const { isPanning, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, setVerticalScrollHandler } = usePanZoom({ canvasWidth: width });
  
  // Calculate dynamic canvas height based on moment positions
  const { canvasHeight, timelineY, scrollOffset } = useMemo(() => {
    if (moments.length === 0) {
      return { canvasHeight: viewportHeight, timelineY: viewportHeight / 2, scrollOffset: 0 };
    }
    
    let minY = Infinity;
    let maxY = -Infinity;
    
    moments.forEach(m => {
      const cardHeight = m.height || DEFAULT_CARD_HEIGHT;
      minY = Math.min(minY, m.y);
      maxY = Math.max(maxY, m.y + cardHeight);
    });
    
    // Calculate required height with padding
    const requiredHeight = Math.max(viewportHeight, maxY - minY + PADDING * 2);
    
    // Keep timeline centered in viewport, but allow scrolling
    const timelinePos = viewportHeight / 2;
    
    // Calculate how much we need to scroll to show all content
    const contentTop = Math.min(0, minY - PADDING);
    const contentBottom = Math.max(viewportHeight, maxY + PADDING);
    const totalHeight = contentBottom - contentTop;
    
    return { 
      canvasHeight: Math.max(viewportHeight, totalHeight), 
      timelineY: timelinePos - contentTop,
      scrollOffset: contentTop
    };
  }, [moments, viewportHeight]);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPosition, setCreatePosition] = useState({ timestamp: Date.now(), y: 0 });
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
    setCreatePosition({ timestamp: capturedTimestamp, y: viewportHeight / 2 });
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
      className="w-full h-full bg-[hsl(var(--canvas-bg))] overflow-auto touch-none"
      onMouseDown={handleMouseDown as any}
      onMouseMove={handleMouseMove as any}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown as any}
      onTouchMove={handleMouseMove as any}
      onTouchEnd={handleMouseUp}
      onWheel={(e) => {
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
          
          {/* Moment cards - filter by memorable on monthly/yearly views */}
          {moments
            .filter((moment) => {
              const zoomLevel = getZoomLevel(canvasState.msPerPixel);
              if (zoomLevel === 'month' || zoomLevel === 'year') {
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
              />
            ))}
        </Layer>
      </Stage>
      
      {/* Navigation controls */}
      <NavigationControls />
      
      {/* Add moment button - pushed lower on mobile */}
      <Button
        onClick={handleAddMoment}
        className="absolute right-4 top-14 md:top-4 rounded-full shadow-lg"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Moment
      </Button>
      
      {/* Feedback button - higher on mobile to avoid overlap with Jump to Now */}
      <Button
        onClick={() => setFeedbackOpen(true)}
        className="absolute right-4 bottom-20 md:bottom-4 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white"
        size="sm"
      >
        <MessageSquare className="h-4 w-4 mr-1.5" />
        Feedback
      </Button>
      
      {/* Feedback popup */}
      <FeedbackPopup open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      
      {/* Help text - different for mobile vs desktop */}
      <div className="absolute top-4 left-4 text-xs text-muted-foreground">
        <span className="bg-card/80 backdrop-blur-sm px-2 py-1 rounded hidden md:inline">
          Double-click to add • Drag to pan • Scroll horizontal • Shift+scroll vertical
        </span>
        <span className="bg-card/80 backdrop-blur-sm px-2 py-1 rounded md:hidden">
          Tap + to add • Swipe left/right for time • Swipe up/down to scroll
        </span>
      </div>
      
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
