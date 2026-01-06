import { useState, useCallback } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { Plus } from 'lucide-react';
import { useCanvasSize } from '@/hooks/useCanvasSize';
import { usePanZoom } from '@/hooks/usePanZoom';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { TimeAxis } from './TimeAxis';
import { MomentCard } from './MomentCard';
import { CreateMomentDialog } from './CreateMomentDialog';
import { EditMomentDialog } from './EditMomentDialog';
import { NavigationControls } from './NavigationControls';
import { xToTime } from '@/utils/timeUtils';
import { Button } from '@/components/ui/button';
import type { Moment } from '@/types/moment';

export function TimelineCanvas() {
  const { width, height } = useCanvasSize();
  const { moments, canvasState } = useMomentsStore();
  const { isPanning, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } = usePanZoom({ canvasWidth: width });
  
  const timelineY = height / 2;
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPosition, setCreatePosition] = useState({ timestamp: Date.now(), y: 0 });
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);

  const handleCanvasClick = useCallback((e: any) => {
    // Only create on double-click to avoid accidental creation
    if (e.evt.detail !== 2) return;
    
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    if (!pointerPos) return;
    
    const timestamp = xToTime(pointerPos.x, canvasState.centerTime, canvasState.msPerPixel, width);
    const y = pointerPos.y;
    
    setCreatePosition({ timestamp, y });
    setCreateDialogOpen(true);
  }, [canvasState, width]);

  const handleSelectMoment = useCallback((moment: Moment) => {
    setSelectedMoment(moment);
  }, []);

  const handleAddMoment = useCallback(() => {
    // Create at current center time and middle of canvas
    setCreatePosition({ timestamp: canvasState.centerTime, y: height / 2 });
    setCreateDialogOpen(true);
  }, [canvasState.centerTime, height]);

  return (
    <div 
      className="w-full h-full bg-[hsl(var(--canvas-bg))] overflow-hidden"
      onMouseDown={handleMouseDown as any}
      onMouseMove={handleMouseMove as any}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel as any}
    >
      <Stage 
        width={width} 
        height={height}
        onClick={handleCanvasClick}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
          />
          
          {/* Time axis */}
          <TimeAxis width={width} height={height} />
          
          {/* Moment cards */}
          {moments.map((moment) => (
            <MomentCard
              key={moment.id}
              moment={moment}
              canvasWidth={width}
              canvasHeight={height}
              onSelect={handleSelectMoment}
              timelineY={timelineY}
            />
          ))}
        </Layer>
      </Stage>
      
      {/* Navigation controls */}
      <NavigationControls />
      
      {/* Add moment button */}
      <Button
        onClick={handleAddMoment}
        className="absolute top-4 right-4 rounded-full shadow-lg"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Moment
      </Button>
      
      {/* Help text */}
      <div className="absolute top-4 left-4 text-xs text-muted-foreground">
        <span className="bg-card/80 backdrop-blur-sm px-2 py-1 rounded">
          Double-click to add • Drag to pan • Scroll to zoom
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
