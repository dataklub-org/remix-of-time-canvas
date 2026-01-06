import { useState, useRef, useEffect, useCallback } from 'react';
import { Group, Rect, Text, Line, Circle, Image as KonvaImage } from 'react-konva';
import type { Moment } from '@/types/moment';
import { timeToX, getZoomLevel } from '@/utils/timeUtils';
import { useMomentsStore } from '@/stores/useMomentsStore';

interface MomentCardProps {
  moment: Moment;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: (moment: Moment) => void;
  timelineY: number;
}

const MIN_CARD_WIDTH = 100;
const MIN_CARD_HEIGHT = 36;
const CARD_RADIUS = 12;
const RESIZE_HANDLE_SIZE = 20;
const TIMELINE_BUFFER = 10;
const PADDING_X = 16;
const PADDING_Y = 8;
const LINE_HEIGHT = 14;
const SMALL_LINE_HEIGHT = 12;
const BUBBLE_SIZE = 24;
const BUBBLE_EXPANDED_SIZE = 80;

// Helper to measure text width (approximate)
function measureTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.55;
}

export function MomentCard({ moment, canvasWidth, canvasHeight, onSelect, timelineY }: MomentCardProps) {
  const { canvasState, updateMomentY, updateMomentSize, updateMoment } = useMomentsStore();
  const { centerTime, msPerPixel } = canvasState;
  
  // Check zoom level - show bubbles at day/week/month/year zoom
  const zoomLevel = getZoomLevel(msPerPixel);
  const isBubbleMode = zoomLevel === 'day' || zoomLevel === 'week' || zoomLevel === 'month' || zoomLevel === 'year';
  
  // Bubble hover state
  const [isHovered, setIsHovered] = useState(false);
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null);
  
  // Load photo image for Konva
  useEffect(() => {
    if (moment.photo) {
      const img = new window.Image();
      img.onload = () => setPhotoImage(img);
      img.src = moment.photo;
    } else {
      setPhotoImage(null);
    }
  }, [moment.photo]);
  
  // Calculate content-based dimensions
  const descriptionText = moment.description || 'Untitled moment';
  const hasPhoto = !!moment.photo;
  const hasPeople = !!moment.people;
  const hasLocation = !!moment.location;
  
  // Calculate minimum width based on content
  const descWidth = measureTextWidth(descriptionText, 12) + PADDING_X * 2 + 24;
  const peopleWidth = hasPeople ? measureTextWidth(moment.people!, 10) + PADDING_X * 2 : 0;
  const locationWidth = hasLocation ? measureTextWidth(`📍 ${moment.location}`, 9) + PADDING_X * 2 : 0;
  
  const contentWidth = Math.max(MIN_CARD_WIDTH, descWidth, peopleWidth, locationWidth);
  
  // Calculate minimum height based on content
  let contentHeight = PADDING_Y * 2 + LINE_HEIGHT;
  if (hasPeople) contentHeight += SMALL_LINE_HEIGHT + 2;
  if (hasLocation) contentHeight += SMALL_LINE_HEIGHT + 2;
  contentHeight = Math.max(MIN_CARD_HEIGHT, contentHeight);
  
  // Use stored dimensions if larger than content, otherwise use content dimensions
  const cardWidth = moment.width ? Math.max(moment.width, contentWidth) : contentWidth;
  const cardHeight = moment.height ? Math.max(moment.height, contentHeight) : contentHeight;
  
  const startX = timeToX(moment.timestamp, centerTime, msPerPixel, canvasWidth);
  const endTime = moment.endTime || moment.timestamp;
  const endX = timeToX(endTime, centerTime, msPerPixel, canvasWidth);
  
  // Color based on category
  const accentColor = moment.category === 'business' ? '#4a7dff' : '#f5a623';
  const lineColor = moment.category === 'business' ? 'rgba(74, 125, 255, 0.4)' : 'rgba(245, 166, 35, 0.4)';
  
  // Bubble mode positioning
  const bubbleX = (startX + endX) / 2;
  const bubbleY = moment.y + (moment.y < timelineY ? cardHeight / 2 : cardHeight / 2);
  const currentBubbleSize = isHovered ? BUBBLE_EXPANDED_SIZE : BUBBLE_SIZE;
  
  // Card mode positioning
  const cardLeft = startX;
  const cardRight = startX + cardWidth;
  const cardTop = moment.y;
  const cardBottom = moment.y + cardHeight;
  
  // Visibility check
  const isVisible = isBubbleMode 
    ? bubbleX >= -BUBBLE_EXPANDED_SIZE && bubbleX <= canvasWidth + BUBBLE_EXPANDED_SIZE
    : cardRight >= -50 && cardLeft <= canvasWidth + 50;
  
  const [isResizing, setIsResizing] = useState(false);
  const [isHoveringResize, setIsHoveringResize] = useState(false);
  const resizeStartRef = useRef<{ width: number; height: number; x: number; y: number } | null>(null);
  const justFinishedResizingRef = useRef(false);

  const handleDragEnd = (e: any) => {
    updateMomentY(moment.id, e.target.y());
  };
  
  const handleCardClick = useCallback(() => {
    if (justFinishedResizingRef.current) {
      return;
    }
    onSelect(moment);
  }, [moment, onSelect]);

  const dispatchResizeState = (resizing: boolean) => {
    window.dispatchEvent(new CustomEvent('momentResizing', { detail: { resizing } }));
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeStartRef.current) return;
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    
    const newWidth = Math.max(20, resizeStartRef.current.width + deltaX);
    let newHeight = Math.max(20, resizeStartRef.current.height + deltaY);
    
    const isAbove = moment.y < timelineY;
    if (isAbove) {
      const maxHeight = timelineY - moment.y - TIMELINE_BUFFER;
      newHeight = Math.min(newHeight, maxHeight);
    }
    
    updateMomentSize(moment.id, newWidth, newHeight);
  }, [moment.id, moment.y, timelineY, updateMomentSize]);

  const handleGlobalMouseUp = useCallback(() => {
    if (!isResizing) return;
    setIsResizing(false);
    resizeStartRef.current = null;
    document.body.style.cursor = '';
    dispatchResizeState(false);
    justFinishedResizingRef.current = true;
    setTimeout(() => {
      justFinishedResizingRef.current = false;
    }, 500);
  }, [isResizing]);

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

  // ===== BUBBLE MODE =====
  if (isBubbleMode) {
    // When hovered, show full card; otherwise show bubble
    if (isHovered) {
      // Show the full card on hover
      const hoverCardWidth = cardWidth;
      const hoverCardHeight = cardHeight;
      const hoverCardX = bubbleX - hoverCardWidth / 2;
      const hoverCardY = moment.y;
      const isAboveTimeline = hoverCardY + hoverCardHeight < timelineY;
      const curveStrength = Math.abs(timelineY - (isAboveTimeline ? hoverCardY + hoverCardHeight : hoverCardY)) * 0.4;

      return (
        <Group
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Left connecting line (bezier curve) */}
          <Line
            points={[
              hoverCardX, isAboveTimeline ? hoverCardY + hoverCardHeight : hoverCardY,
              hoverCardX, (isAboveTimeline ? hoverCardY + hoverCardHeight : hoverCardY) + (isAboveTimeline ? curveStrength : -curveStrength),
              startX, timelineY + (isAboveTimeline ? -curveStrength : curveStrength),
              startX, timelineY,
            ]}
            stroke={lineColor}
            strokeWidth={2}
            bezier
            listening={false}
          />
          
          {/* Right connecting line (bezier curve) */}
          <Line
            points={[
              hoverCardX + hoverCardWidth, isAboveTimeline ? hoverCardY + hoverCardHeight : hoverCardY,
              hoverCardX + hoverCardWidth, (isAboveTimeline ? hoverCardY + hoverCardHeight : hoverCardY) + (isAboveTimeline ? curveStrength : -curveStrength),
              endX, timelineY + (isAboveTimeline ? -curveStrength : curveStrength),
              endX, timelineY,
            ]}
            stroke={lineColor}
            strokeWidth={2}
            bezier
            listening={false}
          />
          
          <Group
            x={hoverCardX}
            y={hoverCardY}
            onClick={handleCardClick}
            onTap={handleCardClick}
          >
            {/* Card background */}
            <Rect
              width={hoverCardWidth}
              height={hoverCardHeight}
              fill="#ffffff"
              cornerRadius={CARD_RADIUS}
              shadowColor="rgba(0,0,0,0.15)"
              shadowBlur={16}
              shadowOffsetY={6}
            />
            
            {/* Category accent bar */}
            <Rect
              x={0}
              y={0}
              width={6}
              height={hoverCardHeight}
              fill={accentColor}
              cornerRadius={[CARD_RADIUS, 0, 0, CARD_RADIUS]}
            />
            
            {/* Photo thumbnail if exists */}
            {photoImage && hoverCardHeight >= 50 && (
              <Group clipFunc={(ctx) => {
                ctx.roundRect(hoverCardWidth - 44, 8, 36, 36, 6);
              }}>
                <KonvaImage
                  image={photoImage}
                  x={hoverCardWidth - 44}
                  y={8}
                  width={36}
                  height={36}
                />
              </Group>
            )}
            
            {/* Description */}
            <Text
              x={16}
              y={hoverCardHeight > 40 ? 10 : Math.max(4, hoverCardHeight / 2 - 6)}
              width={Math.max(10, hoverCardWidth - (photoImage && hoverCardHeight >= 50 ? 60 : 36))}
              text={moment.description || 'Untitled moment'}
              fontSize={hoverCardHeight < 50 ? Math.max(8, Math.min(12, hoverCardHeight / 5)) : 12}
              fontFamily="Inter, sans-serif"
              fontStyle="500"
              fill="#2a3142"
              ellipsis
              wrap="none"
            />
            
            {/* People */}
            {moment.people && hoverCardHeight >= 45 && (
              <Text
                x={16}
                y={hoverCardHeight < 60 ? Math.max(22, hoverCardHeight - 22) : 28}
                width={Math.max(10, hoverCardWidth - (photoImage && hoverCardHeight >= 50 ? 60 : 36))}
                text={moment.people}
                fontSize={hoverCardHeight < 60 ? Math.max(7, Math.min(10, hoverCardHeight / 7)) : 10}
                fontFamily="Inter, sans-serif"
                fill="#7a8494"
                ellipsis
                wrap="none"
              />
            )}
            
            {/* Location */}
            {moment.location && hoverCardHeight >= 60 && (
              <Text
                x={16}
                y={hoverCardHeight < 80 ? Math.max(38, hoverCardHeight - 18) : (moment.people ? 44 : 28)}
                width={Math.max(10, hoverCardWidth - (photoImage && hoverCardHeight >= 50 ? 60 : 36))}
                text={`📍 ${moment.location}`}
                fontSize={hoverCardHeight < 80 ? Math.max(7, Math.min(9, hoverCardHeight / 9)) : 9}
                fontFamily="Inter, sans-serif"
                fill="#9aa3b2"
                ellipsis
                wrap="none"
              />
            )}
            
            {/* Memorable indicator */}
            <Group
              x={photoImage && hoverCardHeight >= 50 ? hoverCardWidth - 50 : hoverCardWidth - 24}
              y={4}
              onClick={(e) => {
                e.cancelBubble = true;
                updateMoment(moment.id, { memorable: !moment.memorable });
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                updateMoment(moment.id, { memorable: !moment.memorable });
              }}
            >
              <Rect
                width={18}
                height={18}
                fill={moment.memorable ? accentColor : '#9ca3af'}
                cornerRadius={4}
              />
              <Text
                x={4}
                y={2}
                text="M"
                fontSize={12}
                fontFamily="Inter, sans-serif"
                fontStyle="bold"
                fill="#ffffff"
              />
            </Group>
          </Group>
        </Group>
      );
    }

    // Collapsed bubble view
    return (
      <Group
        x={bubbleX}
        y={bubbleY}
        onClick={handleCardClick}
        onTap={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
      >
        {/* Connecting line to timeline */}
        <Line
          points={[0, 0, 0, timelineY - bubbleY]}
          stroke={lineColor}
          strokeWidth={2}
          listening={false}
        />
        
        {/* Bubble background - show photo if available */}
        {photoImage ? (
          <>
            <Group clipFunc={(ctx) => {
              ctx.arc(0, 0, BUBBLE_SIZE / 2, 0, Math.PI * 2);
            }}>
              <KonvaImage
                image={photoImage}
                x={-BUBBLE_SIZE / 2}
                y={-BUBBLE_SIZE / 2}
                width={BUBBLE_SIZE}
                height={BUBBLE_SIZE}
              />
            </Group>
            <Circle
              x={0}
              y={0}
              radius={BUBBLE_SIZE / 2}
              stroke={accentColor}
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            <Circle
              x={0}
              y={0}
              radius={BUBBLE_SIZE / 2}
              fill="#ffffff"
              stroke={accentColor}
              strokeWidth={2}
              shadowColor="rgba(0,0,0,0.1)"
              shadowBlur={8}
              shadowOffsetY={2}
            />
            
            {/* Category color dot */}
            <Circle
              x={0}
              y={0}
              radius={8}
              fill={accentColor}
            />
          </>
        )}
        
        {/* Memorable indicator */}
        {moment.memorable && !photoImage && (
          <Text
            x={-4}
            y={-5}
            text="M"
            fontSize={10}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            fill="#ffffff"
          />
        )}
      </Group>
    );
  }

  // ===== CARD MODE =====
  const isAboveTimeline = cardBottom < timelineY;
  const curveStrength = Math.abs(timelineY - (isAboveTimeline ? cardBottom : cardTop)) * 0.4;

  const leftLineStart = { x: cardLeft, y: isAboveTimeline ? cardBottom : cardTop };
  const leftLineEnd = { x: startX, y: timelineY };
  
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
          x: cardLeft,
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
        
        {/* Photo thumbnail if exists */}
        {photoImage && cardHeight >= 50 && (
          <Group clipFunc={(ctx) => {
            ctx.roundRect(cardWidth - 44, 8, 36, 36, 6);
          }}>
            <KonvaImage
              image={photoImage}
              x={cardWidth - 44}
              y={8}
              width={36}
              height={36}
            />
          </Group>
        )}
        
        {/* Description - dynamic font size based on card height */}
        <Text
          x={16}
          y={cardHeight > 40 ? 10 : Math.max(4, cardHeight / 2 - 6)}
          width={Math.max(10, cardWidth - (photoImage && cardHeight >= 50 ? 60 : 36))}
          text={moment.description || 'Untitled moment'}
          fontSize={cardHeight < 50 ? Math.max(8, Math.min(12, cardHeight / 5)) : 12}
          fontFamily="Inter, sans-serif"
          fontStyle="500"
          fill="#2a3142"
          ellipsis
          wrap="none"
        />
        
        {/* People - only show if card is tall enough */}
        {moment.people && cardHeight >= 45 && (
          <Text
            x={16}
            y={cardHeight < 60 ? Math.max(22, cardHeight - 22) : 28}
            width={Math.max(10, cardWidth - (photoImage && cardHeight >= 50 ? 60 : 36))}
            text={moment.people}
            fontSize={cardHeight < 60 ? Math.max(7, Math.min(10, cardHeight / 7)) : 10}
            fontFamily="Inter, sans-serif"
            fill="#7a8494"
            ellipsis
            wrap="none"
          />
        )}
        
        {/* Location - only show if card is tall enough */}
        {moment.location && cardHeight >= 60 && (
          <Text
            x={16}
            y={cardHeight < 80 ? Math.max(38, cardHeight - 18) : (moment.people ? 44 : 28)}
            width={Math.max(10, cardWidth - (photoImage && cardHeight >= 50 ? 60 : 36))}
            text={`📍 ${moment.location}`}
            fontSize={cardHeight < 80 ? Math.max(7, Math.min(9, cardHeight / 9)) : 9}
            fontFamily="Inter, sans-serif"
            fill="#9aa3b2"
            ellipsis
            wrap="none"
          />
        )}
        
        {/* Memorable indicator (M in top right corner) - always visible, clickable */}
        <Group
          x={photoImage && cardHeight >= 50 ? cardWidth - 50 : cardWidth - 24}
          y={4}
          onClick={(e) => {
            e.cancelBubble = true;
            updateMoment(moment.id, { memorable: !moment.memorable });
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            updateMoment(moment.id, { memorable: !moment.memorable });
          }}
        >
          <Rect
            width={18}
            height={18}
            fill={moment.memorable ? accentColor : '#9ca3af'}
            cornerRadius={4}
          />
          <Text
            x={4}
            y={2}
            text="M"
            fontSize={12}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            fill="#ffffff"
          />
        </Group>
        
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