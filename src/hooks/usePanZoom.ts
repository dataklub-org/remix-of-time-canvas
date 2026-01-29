import { useCallback, useRef, useState, useEffect } from 'react';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { clampZoom, ZOOM_LEVELS, getZoomLevelIndex } from '@/utils/timeUtils';

interface UsePanZoomOptions {
  canvasWidth: number;
}

export function usePanZoom({ canvasWidth }: UsePanZoomOptions) {
  const canvasState = useMomentsStore((state) => state.canvasState);
  const setCenterTime = useMomentsStore((state) => state.setCenterTime);
  const setMsPerPixel = useMomentsStore((state) => state.setMsPerPixel);
  
  // Provide defaults during hydration
  const msPerPixel = canvasState?.msPerPixel ?? 36_000;
  const centerTime = canvasState?.centerTime ?? Date.now();
  
  const [isPanning, setIsPanning] = useState(false);
  const [isResizingMoment, setIsResizingMoment] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; centerTime: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number; centerTime: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; msPerPixel: number } | null>(null);
  const zoomAnimationRef = useRef<number | null>(null);
  const targetMsPerPixelRef = useRef<number>(msPerPixel);
  const verticalScrollRef = useRef<((deltaY: number) => void) | null>(null);

  // Allow external registration of vertical scroll handler
  const setVerticalScrollHandler = useCallback((handler: (deltaY: number) => void) => {
    verticalScrollRef.current = handler;
  }, []);

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

  // Helper to get distance between two touches
  const getTouchDistance = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Smooth zoom animation
  const animateZoom = useCallback((targetMsPerPixel: number) => {
    if (zoomAnimationRef.current) {
      cancelAnimationFrame(zoomAnimationRef.current);
    }
    
    const animate = () => {
      const currentMsPerPixel = msPerPixel;
      const diff = targetMsPerPixel - currentMsPerPixel;
      
      // Very slow easing - only move 3% toward target each frame
      if (Math.abs(diff) > 1) {
        const newMsPerPixel = currentMsPerPixel + diff * 0.03;
        setMsPerPixel(newMsPerPixel);
        zoomAnimationRef.current = requestAnimationFrame(animate);
      } else {
        setMsPerPixel(targetMsPerPixel);
        zoomAnimationRef.current = null;
      }
    };
    
    zoomAnimationRef.current = requestAnimationFrame(animate);
  }, [msPerPixel, setMsPerPixel]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't start panning if resizing a moment
    if (isResizingMoment) return;
    
    // Get client X/Y from mouse or touch event
    let clientX: number;
    let clientY: number;
    if ('touches' in e) {
      // Two finger touch = pinch gesture
      if (e.touches.length === 2) {
        // Cancel any ongoing zoom animation
        if (zoomAnimationRef.current) {
          cancelAnimationFrame(zoomAnimationRef.current);
          zoomAnimationRef.current = null;
        }
        setIsPinching(true);
        pinchStartRef.current = {
          distance: getTouchDistance(e.touches),
          msPerPixel: msPerPixel,
        };
        targetMsPerPixelRef.current = msPerPixel;
        return;
      }
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
      centerTime: centerTime,
    };
    lastTouchRef.current = { x: clientX, y: clientY, centerTime: centerTime };
  }, [centerTime, msPerPixel, isResizingMoment, getTouchDistance]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = 'touches' in e;
    
    // Handle pinch zoom
    if (isTouch && isPinching && e.touches.length === 2 && pinchStartRef.current) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / pinchStartRef.current.distance;
      
      // Invert scale for pinch-in to zoom-in behavior
      // Scale < 1 means fingers moved closer = zoom in = lower msPerPixel
      const newMsPerPixel = pinchStartRef.current.msPerPixel / scale;
      
      // Clamp to valid zoom levels
      const clampedMsPerPixel = Math.max(
        ZOOM_LEVELS[0].msPerPixel,
        Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1].msPerPixel, newMsPerPixel)
      );
      
      // Directly update msPerPixel during pinch for responsiveness
      // Also update the pinch start reference so zooming out works correctly
      setMsPerPixel(clampedMsPerPixel);
      pinchStartRef.current = {
        distance: currentDistance,
        msPerPixel: clampedMsPerPixel,
      };
      targetMsPerPixelRef.current = clampedMsPerPixel;
      return;
    }
    
    if (!isPanning || !panStartRef.current || isResizingMoment) return;
    
    // Get client X/Y from mouse or touch event
    let clientX: number;
    let clientY: number;
    
    if (isTouch) {
      if (e.touches.length !== 1) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // Prevent default touch behavior for smooth scrolling
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const currentMsPerPixel = msPerPixel;
    
    if (isTouch && lastTouchRef.current) {
      const deltaX = clientX - lastTouchRef.current.x;
      const deltaY = clientY - lastTouchRef.current.y;
      
      // Always handle both horizontal pan and vertical scroll simultaneously
      // This allows diagonal swipes to affect both axes
      
      // Horizontal pan - timeline navigation
      if (Math.abs(deltaX) > 0.5) {
        const timeDelta = deltaX * currentMsPerPixel;
        const newCenterTime = lastTouchRef.current.centerTime - timeDelta;
        setCenterTime(newCenterTime);
        lastTouchRef.current.centerTime = newCenterTime;
      }
      
      // Vertical scroll - Y-axis scrolling to see moments above/below
      // Always apply vertical scrolling on touch devices to expose moved moments
      if (verticalScrollRef.current) {
        // Use positive deltaY directly - swiping down moves content down (natural scrolling)
        verticalScrollRef.current(-deltaY);
      }
      
      lastTouchRef.current.x = clientX;
      lastTouchRef.current.y = clientY;
    } else {
      // Mouse: horizontal drag for horizontal pan
      const deltaX = clientX - panStartRef.current.x;
      const deltaTime = deltaX * currentMsPerPixel;
      setCenterTime(panStartRef.current.centerTime - deltaTime);
    }
  }, [isPanning, isPinching, msPerPixel, setCenterTime, isResizingMoment, getTouchDistance, animateZoom]);

  const handleMouseUp = useCallback(() => {
    const wasPinching = isPinching;
    const currentMsPerPixel = msPerPixel;
    
    setIsPanning(false);
    setIsPinching(false);
    panStartRef.current = null;
    lastTouchRef.current = null;
    pinchStartRef.current = null;
    
    // Snap to nearest zoom level after pinch ends and sync store
    if (wasPinching) {
      const currentIndex = getZoomLevelIndex(currentMsPerPixel);
      const targetZoom = ZOOM_LEVELS[currentIndex].msPerPixel;
      targetMsPerPixelRef.current = targetZoom;
      // Immediately set the snapped zoom level to keep store in sync
      setMsPerPixel(targetZoom);
    }
  }, [isPinching, msPerPixel, setMsPerPixel]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Don't handle wheel events while resizing
    if (isResizingMoment) return;
    
    e.preventDefault();
    
    // Detect pinch gesture (ctrlKey is set during pinch on trackpads)
    const isPinch = e.ctrlKey;
    
    if (isPinch) {
      // Cancel any ongoing zoom animation
      if (zoomAnimationRef.current) {
        cancelAnimationFrame(zoomAnimationRef.current);
        zoomAnimationRef.current = null;
      }
      
      // Trackpad pinch: deltaY determines zoom direction
      // Positive deltaY = zoom out, negative = zoom in
      const zoomFactor = 1 + e.deltaY * 0.01;
      const newMsPerPixel = msPerPixel * zoomFactor;
      
      // Clamp to valid zoom range
      const clampedMsPerPixel = Math.max(
        ZOOM_LEVELS[0].msPerPixel,
        Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1].msPerPixel, newMsPerPixel)
      );
      
      setMsPerPixel(clampedMsPerPixel);
      targetMsPerPixelRef.current = clampedMsPerPixel;
    } else {
      // Regular scroll: horizontal pan
      const panDelta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const timeDelta = panDelta * msPerPixel * 0.5;
      setCenterTime(centerTime + timeDelta);
    }
  }, [msPerPixel, centerTime, setCenterTime, setMsPerPixel, isResizingMoment]);

  return {
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    setVerticalScrollHandler,
  };
}
