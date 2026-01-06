import { useCallback, useRef, useState, useEffect } from 'react';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { clampZoom } from '@/utils/timeUtils';

interface UsePanZoomOptions {
  canvasWidth: number;
}

export function usePanZoom({ canvasWidth }: UsePanZoomOptions) {
  const { canvasState, setCenterTime, setMsPerPixel } = useMomentsStore();
  const [isPanning, setIsPanning] = useState(false);
  const [isResizingMoment, setIsResizingMoment] = useState(false);
  const panStartRef = useRef<{ x: number; centerTime: number } | null>(null);

  // Listen for moment resize events to block panning
  useEffect(() => {
    const handleMomentResizing = (e: CustomEvent<{ resizing: boolean }>) => {
      setIsResizingMoment(e.detail.resizing);
    };
    
    window.addEventListener('momentResizing', handleMomentResizing as EventListener);
    return () => {
      window.removeEventListener('momentResizing', handleMomentResizing as EventListener);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't start panning if resizing a moment
    if (isResizingMoment) return;
    
    // Get client X from mouse or touch event
    let clientX: number;
    if ('touches' in e) {
      if (e.touches.length !== 1) return; // Only single touch for panning
      clientX = e.touches[0].clientX;
    } else {
      // Pan on left click drag
      if (e.button !== 0 && e.button !== 1) return;
      clientX = e.clientX;
    }
    
    setIsPanning(true);
    panStartRef.current = {
      x: clientX,
      centerTime: canvasState.centerTime,
    };
  }, [canvasState.centerTime, isResizingMoment]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning || !panStartRef.current || isResizingMoment) return;
    
    // Get client X from mouse or touch event
    let clientX: number;
    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    const deltaX = clientX - panStartRef.current.x;
    const deltaTime = deltaX * canvasState.msPerPixel;
    setCenterTime(panStartRef.current.centerTime - deltaTime);
  }, [isPanning, canvasState.msPerPixel, setCenterTime, isResizingMoment]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Don't handle wheel events while resizing
    if (isResizingMoment) return;
    
    e.preventDefault();
    
    // Detect pinch gesture (ctrlKey is set during pinch on trackpads)
    const isPinch = e.ctrlKey;
    
    if (isPinch) {
      // Pinch-to-zoom is disabled - do nothing
      return;
    } else {
      // Regular scroll: horizontal pan
      const panDelta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const timeDelta = panDelta * canvasState.msPerPixel * 0.5;
      setCenterTime(canvasState.centerTime + timeDelta);
    }
  }, [canvasState, setCenterTime, isResizingMoment]);

  return {
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  };
}
