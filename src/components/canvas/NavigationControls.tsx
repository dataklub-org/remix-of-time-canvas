import { Button } from '@/components/ui/button';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { Focus, ZoomIn, ZoomOut } from 'lucide-react';
import { ZOOM_LEVELS, getZoomLevelIndex } from '@/utils/timeUtils';

export function NavigationControls() {
  const { canvasState, jumpToNow, setMsPerPixel } = useMomentsStore();
  
  const currentIndex = getZoomLevelIndex(canvasState.msPerPixel);
  
  const handleZoomIn = () => {
    if (currentIndex > 0) {
      setMsPerPixel(ZOOM_LEVELS[currentIndex - 1].msPerPixel);
    }
  };
  
  const handleZoomOut = () => {
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setMsPerPixel(ZOOM_LEVELS[currentIndex + 1].msPerPixel);
    }
  };

  const unitLabels: Record<string, string> = {
    '15min': '15m',
    'hour': '1h',
    'day': '1d',
    'month': '1mo',
    'year': '1y',
  };

  const currentUnit = ZOOM_LEVELS[currentIndex].unit;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-lg border border-border">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleZoomOut}
        disabled={currentIndex >= ZOOM_LEVELS.length - 1}
        className="h-8 w-8 p-0 rounded-full"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <span className="text-xs text-muted-foreground px-2 min-w-[40px] text-center">
        {unitLabels[currentUnit]}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleZoomIn}
        disabled={currentIndex <= 0}
        className="h-8 w-8 p-0 rounded-full"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-5 bg-border mx-1" />
      
      <Button
        variant="default"
        size="sm"
        onClick={jumpToNow}
        className="h-8 px-4 rounded-full text-xs font-medium"
      >
        <Focus className="h-3.5 w-3.5 mr-1.5" />
        Jump to Now
      </Button>
    </div>
  );
}
