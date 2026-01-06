import { useState, useRef, useEffect, useCallback } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import type { Moment } from '@/types/moment';
import { timeToX } from '@/utils/timeUtils';
import { useMomentsStore } from '@/stores/useMomentsStore';

interface MomentCardProps {
  moment: Moment;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: (moment: Moment) => void;
  timelineY: number;
}

const DEFAULT_CARD_WIDTH = 220;
const DEFAULT_CARD_HEIGHT = 80;
const CARD_RADIUS = 12;
const RESIZE_HANDLE_SIZE = 20;
const TIMELINE_BUFFER = 10; // Minimum distance from timeline

export function MomentCard({ moment, canvasWidth, canvasHeight, onSelect, timelineY }: MomentCardProps) {
  const { canvasState, updateMomentY, updateMomentSize } = useMomentsStore();
  const { centerTime, msPerPixel } = canvasState;
  
  const cardWidth = moment.width || DEFAULT_CARD_WIDTH;
  const cardHeight = moment.height || DEFAULT_CARD_HEIGHT;
  
  const startX = timeToX(moment.timestamp, centerTime, msPerPixel, canvasWidth);
  const endTime = moment.endTime || moment.timestamp;
  const endX = timeToX(endTime, centerTime, msPerPixel, canvasWidth);
  
  // Card is positioned at start timestamp
  const cardLeft = startX;
  const cardRight = startX + cardWidth;
  const cardTop = moment.y;
  const cardBottom = moment.y + cardHeight;
  
  // Color based on category
  const accentColor = moment.category === 'business' ? '#4a7dff' : '#f5a623';
  const lineColor = moment.category === 'business' ? 'rgba(74, 125, 255, 0.4)' : 'rgba(245, 166, 35, 0.4)';
  
  // Check if card is visible (with some buffer)
  const isVisible = cardRight >= -50 && cardLeft <= canvasWidth + 50;
  
  const [isResizing, setIsResizing] = useState(false);
  const [isHoveringResize, setIsHoveringResize] = useState(false);
  const resizeStartRef = useRef<{ width: number; height: number; x: number; y: number } | null>(null);
  const justFinishedResizingRef = useRef(false);

  const handleDragEnd = (e: any) => {
    updateMomentY(moment.id, e.target.y());
  };
  
  const handleCardClick = () => {
    // Don't open dialog if we just finished resizing
    if (justFinishedResizingRef.current) {
      justFinishedResizingRef.current = false;
      return;
    }
    onSelect(moment);
  };

  // Dispatch custom event to notify pan/zoom to stop
  const dispatchResizeState = (resizing: boolean) => {
    window.dispatchEvent(new CustomEvent('momentResizing', { detail: { resizing } }));
  };

  // Global mouse move handler for resize
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeStartRef.current) return;
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    
    const newWidth = Math.max(20, resizeStartRef.current.width + deltaX);
    let newHeight = Math.max(20, resizeStartRef.current.height + deltaY);
    
    // Prevent card from crossing the timeline
    const isAbove = moment.y < timelineY;
    if (isAbove) {
      // Card is above timeline - limit height so bottom doesn't cross timeline
      const maxHeight = timelineY - moment.y - TIMELINE_BUFFER;
      newHeight = Math.min(newHeight, maxHeight);
    } else {
      // Card is below timeline - no height restriction needed
    }
    
    updateMomentSize(moment.id, newWidth, newHeight);
  }, [moment.id, moment.y, timelineY, updateMomentSize]);

  // Global mouse up handler for resize
  const handleGlobalMouseUp = useCallback(() => {
    setIsResizing(false);
    resizeStartRef.current = null;
    document.body.style.cursor = '';
    dispatchResizeState(false);
    // Mark that we just finished resizing to prevent click from opening dialog
    justFinishedResizingRef.current = true;
    // Reset the flag after a short delay
    setTimeout(() => {
      justFinishedResizingRef.current = false;
    }, 100);
  }, []);

  // Attach/detach global listeners when resizing
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isResizing, handleGlobalMouseMove, handleGlobalMouseUp]);

  const handleResizeStart = (e: any) => {
    e.cancelBubble = true;
    setIsResizing(true);
    dispatchResizeState(true);
    resizeStartRef.current = {
      width: cardWidth,
      height: cardHeight,
      x: e.evt.clientX,
      y: e.evt.clientY,
    };
    document.body.style.cursor = 'nwse-resize';
  };

  const handleResizeEnter = (e: any) => {
    setIsHoveringResize(true);
    if (!isResizing) {
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = 'nwse-resize';
      }
    }
  };

  const handleResizeLeave = (e: any) => {
    setIsHoveringResize(false);
    if (!isResizing) {
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = '';
      }
    }
  };
  
  if (!isVisible) return null;

  // Calculate bezier curve control points for smooth lines going DOWN to timeline
  const isAboveTimeline = cardBottom < timelineY;
  const curveStrength = Math.abs(timelineY - (isAboveTimeline ? cardBottom : cardTop)) * 0.4;

  // Left line: from bottom-left corner of card to start timestamp on timeline
  const leftLineStart = { x: cardLeft, y: isAboveTimeline ? cardBottom : cardTop };
  const leftLineEnd = { x: startX, y: timelineY };
  
  // Right line: from bottom-right corner of card to end timestamp on timeline
  const rightLineStart = { x: cardRight, y: isAboveTimeline ? cardBottom : cardTop };
  const rightLineEnd = { x: endX, y: timelineY };

  return (
    <>
      {/* Left connecting line (bezier curve) */}
      <Line
        points={[
          leftLineStart.x, leftLineStart.y,
          leftLineStart.x, leftLineStart.y + (isAboveTimeline ? curveStrength : -curveStrength),
          leftLineEnd.x, leftLineEnd.y + (isAboveTimeline ? -curveStrength : curveStrength),
          leftLineEnd.x, leftLineEnd.y,
        ]}
        stroke={lineColor}
        strokeWidth={2}
        bezier
        listening={false}
      />
      
      {/* Right connecting line (bezier curve) */}
      <Line
        points={[
          rightLineStart.x, rightLineStart.y,
          rightLineStart.x, rightLineStart.y + (isAboveTimeline ? curveStrength : -curveStrength),
          rightLineEnd.x, rightLineEnd.y + (isAboveTimeline ? -curveStrength : curveStrength),
          rightLineEnd.x, rightLineEnd.y,
        ]}
        stroke={lineColor}
        strokeWidth={2}
        bezier
        listening={false}
      />
      
      <Group
        x={cardLeft}
        y={moment.y}
        draggable
        dragBoundFunc={(pos) => ({
          x: cardLeft, // Lock X position to start timestamp
          y: pos.y,
        })}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        onTap={handleCardClick}
      >
        {/* Card background */}
        <Rect
          width={cardWidth}
          height={cardHeight}
          fill="#ffffff"
          cornerRadius={CARD_RADIUS}
          shadowColor="rgba(0,0,0,0.08)"
          shadowBlur={12}
          shadowOffsetY={4}
        />
        
        {/* Category accent bar */}
        <Rect
          x={0}
          y={0}
          width={6}
          height={cardHeight}
          fill={accentColor}
          cornerRadius={[CARD_RADIUS, 0, 0, CARD_RADIUS]}
        />
        
        {/* Description */}
        <Text
          x={16}
          y={cardHeight > 40 ? 10 : cardHeight / 2 - 6}
          width={Math.max(10, cardWidth - 28)}
          text={moment.description || 'Untitled moment'}
          fontSize={12}
          fontFamily="Inter, sans-serif"
          fontStyle="500"
          fill="#2a3142"
          ellipsis
          wrap="none"
        />
        
        {/* People */}
        {moment.people && (
          <Text
            x={16}
            y={28}
            width={Math.max(10, cardWidth - 28)}
            text={moment.people}
            fontSize={10}
            fontFamily="Inter, sans-serif"
            fill="#7a8494"
            ellipsis
            wrap="none"
          />
        )}
        
        {/* Location */}
        {moment.location && (
          <Text
            x={16}
            y={moment.people ? 44 : 28}
            width={Math.max(10, cardWidth - 28)}
            text={`📍 ${moment.location}`}
            fontSize={9}
            fontFamily="Inter, sans-serif"
            fill="#9aa3b2"
            ellipsis
            wrap="none"
          />
        )}
        
        {/* Resize handle (bottom-right corner) - larger hit area */}
        <Group
          x={cardWidth - RESIZE_HANDLE_SIZE}
          y={cardHeight - RESIZE_HANDLE_SIZE}
          onMouseDown={handleResizeStart}
          onMouseEnter={handleResizeEnter}
          onMouseLeave={handleResizeLeave}
        >
          {/* Invisible larger hit area */}
          <Rect
            width={RESIZE_HANDLE_SIZE}
            height={RESIZE_HANDLE_SIZE}
            fill="transparent"
          />
          {/* Visual resize indicator - diagonal lines */}
          <Line
            points={[
              RESIZE_HANDLE_SIZE - 4, RESIZE_HANDLE_SIZE - 10,
              RESIZE_HANDLE_SIZE - 4, RESIZE_HANDLE_SIZE - 4,
              RESIZE_HANDLE_SIZE - 10, RESIZE_HANDLE_SIZE - 4
            ]}
            stroke={isHoveringResize ? '#888' : '#c4c9d4'}
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
          <Line
            points={[
              RESIZE_HANDLE_SIZE - 4, RESIZE_HANDLE_SIZE - 6,
              RESIZE_HANDLE_SIZE - 6, RESIZE_HANDLE_SIZE - 4
            ]}
            stroke={isHoveringResize ? '#888' : '#c4c9d4'}
            strokeWidth={2}
            lineCap="round"
          />
        </Group>
      </Group>
    </>
  );
}
