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
  const panStartRef = useRef<{ x: number; y: number; centerTime: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number; centerTime: number } | null>(null);

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
    
    // Get client X/Y from mouse or touch event
    let clientX: number;
    let clientY: number;
    if ('touches' in e) {
      if (e.touches.length !== 1) return; // Only single touch for panning
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Pan on left click drag
      if (e.button !== 0 && e.button !== 1) return;
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    setIsPanning(true);
    panStartRef.current = {
      x: clientX,
      y: clientY,
      centerTime: canvasState.centerTime,
    };
    lastTouchRef.current = { x: clientX, y: clientY, centerTime: canvasState.centerTime };
  }, [canvasState.centerTime, isResizingMoment]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning || !panStartRef.current || isResizingMoment) return;
    
    // Get client X/Y from mouse or touch event
    let clientX: number;
    let clientY: number;
    const isTouch = 'touches' in e;
    
    if (isTouch) {
      if (e.touches.length !== 1) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const { msPerPixel } = canvasState;
    
    // For touch: use vertical drag for horizontal timeline panning
    if (isTouch && lastTouchRef.current) {
      const deltaY = clientY - lastTouchRef.current.y;
      // Vertical drag translates to horizontal timeline pan
      const timeDelta = deltaY * msPerPixel * 2;
      const newCenterTime = lastTouchRef.current.centerTime + timeDelta;
      setCenterTime(newCenterTime);
      lastTouchRef.current = { x: clientX, y: clientY, centerTime: newCenterTime };
    } else {
      // Mouse: horizontal drag for horizontal pan
      const deltaX = clientX - panStartRef.current.x;
      const deltaTime = deltaX * msPerPixel;
      setCenterTime(panStartRef.current.centerTime - deltaTime);
    }
  }, [isPanning, canvasState.msPerPixel, setCenterTime, isResizingMoment]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
    lastTouchRef.current = null;
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
