import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import fractalito from '@/assets/fractalito-logo.png';
const DEFAULT_CARD_HEIGHT = 56;
const PADDING = 100;
const DEFAULT_MS_PER_PIXEL = 36_000;

export function TimelineCanvas() {
  const { width, height: viewportHeight } = useCanvasSize();
  const { moments, canvasState } = useMomentsStore();
  const { isPanning, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, setVerticalScrollHandler } = usePanZoom({ canvasWidth: width });
  const initialMsPerPixelRef = useRef(canvasState.msPerPixel);
  const [showVision, setShowVision] = useState(true);
  
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
      
      {/* Branding logo - same row as Add Moment */}
      <div className="absolute top-14 md:top-4 left-4">
        <img src={fractalito} alt="fractalito" className="h-5 w-auto" />
      </div>
      
      {/* Vision statement - top center below buttons */}
      {showVision && (
        <div className="absolute top-24 md:top-16 left-1/2 transform -translate-x-1/2 text-center pointer-events-none select-none max-w-2xl px-4">
          <p className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-2">
            fractalito is a visual memory plane
          </p>
          <p className="text-base md:text-lg italic text-foreground/80 tracking-wide mb-2">
            Time flows horizontally, moments live in space
          </p>
          <p className="text-xs md:text-sm font-normal text-muted-foreground max-w-md mx-auto leading-relaxed">
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
