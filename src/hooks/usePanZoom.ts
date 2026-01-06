import { useCallback, useRef, useState } from 'react';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { clampZoom } from '@/utils/timeUtils';

interface UsePanZoomOptions {
  canvasWidth: number;
}

export function usePanZoom({ canvasWidth }: UsePanZoomOptions) {
  const { canvasState, setCenterTime, setMsPerPixel } = useMomentsStore();
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; centerTime: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Pan on left click drag
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        centerTime: canvasState.centerTime,
      };
    }
  }, [canvasState.centerTime]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStartRef.current) return;
    
    const deltaX = e.clientX - panStartRef.current.x;
    const deltaTime = deltaX * canvasState.msPerPixel;
    setCenterTime(panStartRef.current.centerTime - deltaTime);
  }, [isPanning, canvasState.msPerPixel, setCenterTime]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Detect pinch gesture (ctrlKey is set during pinch on trackpads)
    const isPinch = e.ctrlKey;
    
    if (isPinch) {
      // Pinch-to-zoom: adjust x-axis time range
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const newMsPerPixel = clampZoom(canvasState.msPerPixel * zoomFactor);
      
      // Zoom towards cursor position
      const rect = e.currentTarget.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const centerX = canvasWidth / 2;
      const cursorOffset = cursorX - centerX;
      
      // Time at cursor before zoom
      const cursorTime = canvasState.centerTime + cursorOffset * canvasState.msPerPixel;
      
      // Adjust center to keep cursor time in same position
      const newCenterTime = cursorTime - cursorOffset * newMsPerPixel;
      
      setMsPerPixel(newMsPerPixel);
      setCenterTime(newCenterTime);
    } else {
      // Regular scroll: horizontal pan
      const panDelta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const timeDelta = panDelta * canvasState.msPerPixel * 0.5;
      setCenterTime(canvasState.centerTime + timeDelta);
    }
  }, [canvasState, canvasWidth, setCenterTime, setMsPerPixel]);

  return {
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  };
}
