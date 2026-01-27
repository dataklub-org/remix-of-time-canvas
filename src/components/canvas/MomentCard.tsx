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

const MIN_CARD_WIDTH = 30; // Very small minimum to allow compact cards
const MIN_CARD_HEIGHT = 40;
const CARD_RADIUS = 16;
const RESIZE_HANDLE_SIZE = 20;
const TIMELINE_BUFFER = 10;
const PADDING_X = 18;
const PADDING_Y = 10;
const LINE_HEIGHT = 16;
const SMALL_LINE_HEIGHT = 13;
const BUBBLE_SIZE = 26;
const BUBBLE_EXPANDED_SIZE = 80;

// Expanded card dimensions for hover
const EXPANDED_CARD_WIDTH = 240;
const EXPANDED_CARD_HEIGHT = 100;

// Minimum duration in milliseconds (5 minutes) - this is the minimum width constraint
const MIN_DURATION_MS = 5 * 60 * 1000;

// Helper to measure text width (approximate)
function measureTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.55;
}

export function MomentCard({ moment, canvasWidth, canvasHeight, onSelect, timelineY }: MomentCardProps) {
  const { canvasState, updateMomentY, updateMomentSize, updateMoment } = useMomentsStore();
  const { centerTime, msPerPixel } = canvasState;
  
  // Check zoom level - show bubbles at month/year zoom
  // Memorable moments show as cards at 6h/day/week, only bubbles at month/year
  const zoomLevel = getZoomLevel(msPerPixel);
  const isHighZoom = zoomLevel === 'month' || zoomLevel === 'year';
  const isMediumZoom = zoomLevel === 'day' || zoomLevel === 'week';
  // Bubble mode: always for month/year, or for non-memorable at day/week
  const isBubbleMode = isHighZoom || (isMediumZoom && !moment.memorable);
  
  // Detect mobile device
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  
  // Bubble hover state - on mobile, use "expanded" state for first tap
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // For mobile two-tap behavior
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
  // Modern gradient accents
  const accentColor = moment.category === 'business' ? '#3b82f6' : '#f59e0b';
  const accentColorLight = moment.category === 'business' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  const lineColor = moment.category === 'business' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(245, 158, 11, 0.35)';
  
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

  // Handle bubble tap for mobile - first tap expands, second tap opens edit
  const handleBubbleTap = useCallback(() => {
    if (justFinishedResizingRef.current) {
      return;
    }
    if (isMobile && isBubbleMode) {
      if (isExpanded) {
        // Second tap - open edit dialog
        onSelect(moment);
        setIsExpanded(false);
      } else {
        // First tap - expand to card view
        setIsExpanded(true);
      }
    } else {
      // Desktop behavior - just select
      onSelect(moment);
    }
  }, [moment, onSelect, isMobile, isBubbleMode, isExpanded]);

  const dispatchResizeState = (resizing: boolean) => {
    window.dispatchEvent(new CustomEvent('momentResizing', { detail: { resizing } }));
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeStartRef.current) return;
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    
    // Calculate minimum width based on 5 minutes duration at current zoom level
    const minWidthFromDuration = MIN_DURATION_MS / msPerPixel;
    const minWidth = Math.max(MIN_CARD_WIDTH, minWidthFromDuration);
    
    const newWidth = Math.max(minWidth, resizeStartRef.current.width + deltaX);
    let newHeight = Math.max(MIN_CARD_HEIGHT, resizeStartRef.current.height + deltaY);
    
    const isAbove = moment.y < timelineY;
    if (isAbove) {
      const maxHeight = timelineY - moment.y - TIMELINE_BUFFER;
      newHeight = Math.min(newHeight, maxHeight);
    }
    
    updateMomentSize(moment.id, newWidth, newHeight);
  }, [moment.id, moment.y, timelineY, msPerPixel, updateMomentSize]);

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

  // Photo preview dimensions
  const PHOTO_PREVIEW_WIDTH = 120;
  const PHOTO_PREVIEW_HEIGHT = 90;

  // ===== BUBBLE MODE =====
  if (isBubbleMode) {
    // When hovered (desktop) or expanded (mobile), show expanded card with full description
    const showExpanded = isHovered || (isMobile && isExpanded);
    
    if (showExpanded) {
      // Expanded card dimensions
      const hoverCardWidth = Math.max(cardWidth, EXPANDED_CARD_WIDTH);
      const hoverCardHeight = Math.max(cardHeight, EXPANDED_CARD_HEIGHT);
      const hoverCardX = bubbleX - hoverCardWidth / 2;
      const hoverCardY = moment.y;
      const isAboveTimeline = hoverCardY + hoverCardHeight < timelineY;
      const curveStrength = Math.abs(timelineY - (isAboveTimeline ? hoverCardY + hoverCardHeight : hoverCardY)) * 0.4;
      
      // Photo preview position (below the card)
      const photoPreviewY = hoverCardY + hoverCardHeight + 10;
      const photoPreviewX = hoverCardX + (hoverCardWidth - PHOTO_PREVIEW_WIDTH) / 2;

      return (
        <Group
          onMouseLeave={() => setIsHovered(false)}
          onTouchEnd={(e) => {
            // Collapse on tap outside (but tapping inside will trigger card click first)
          }}
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
            draggable
            dragBoundFunc={(pos) => ({
              x: hoverCardX,
              y: pos.y,
            })}
            onDragEnd={(e) => {
              updateMomentY(moment.id, e.target.y());
            }}
            onClick={handleCardClick}
            onTap={() => {
              if (isMobile) {
                // Second tap on expanded card - open edit
                onSelect(moment);
                setIsExpanded(false);
              } else {
                handleCardClick();
              }
            }}
          >
            {/* Card background with subtle gradient effect */}
            <Rect
              width={hoverCardWidth}
              height={hoverCardHeight}
              fill="#ffffff"
              cornerRadius={CARD_RADIUS}
              shadowColor="rgba(0,0,0,0.12)"
              shadowBlur={24}
              shadowOffsetY={8}
            />
            
            {/* Subtle accent background */}
            <Rect
              width={hoverCardWidth}
              height={hoverCardHeight}
              fill={accentColorLight}
              cornerRadius={CARD_RADIUS}
              opacity={0.5}
            />
            
            {/* Category accent bar - sleeker */}
            <Rect
              x={0}
              y={0}
              width={4}
              height={hoverCardHeight}
              fill={accentColor}
              cornerRadius={[CARD_RADIUS, 0, 0, CARD_RADIUS]}
            />
            
            {/* Description - full text with wrapping */}
            <Text
              x={PADDING_X}
              y={14}
              width={Math.max(10, hoverCardWidth - 44)}
              text={moment.description || 'Untitled moment'}
              fontSize={14}
              fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              fontStyle="600"
              fill="#1a1f2e"
              wrap="word"
              lineHeight={1.3}
            />
            
            {/* People */}
            {moment.people && (
              <Text
                x={PADDING_X}
                y={hoverCardHeight - 38}
                width={Math.max(10, hoverCardWidth - 44)}
                text={moment.people}
                fontSize={11}
                fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                fill="#64748b"
                ellipsis
                wrap="none"
              />
            )}
            
            {/* Location */}
            {moment.location && (
              <Text
                x={PADDING_X}
                y={hoverCardHeight - 22}
                width={Math.max(10, hoverCardWidth - 44)}
                text={`📍 ${moment.location}`}
                fontSize={10}
                fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                fill="#94a3b8"
                ellipsis
                wrap="none"
              />
            )}
            
            {/* Memorable indicator */}
            <Group
              x={hoverCardWidth - 24}
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
          
          {/* Photo preview below the card */}
          {photoImage && (
            <Group
              x={photoPreviewX}
              y={photoPreviewY}
            >
              <Rect
                width={PHOTO_PREVIEW_WIDTH}
                height={PHOTO_PREVIEW_HEIGHT}
                fill="#ffffff"
                cornerRadius={8}
                shadowColor="rgba(0,0,0,0.15)"
                shadowBlur={12}
                shadowOffsetY={4}
              />
              <Group clipFunc={(ctx) => {
                ctx.roundRect(4, 4, PHOTO_PREVIEW_WIDTH - 8, PHOTO_PREVIEW_HEIGHT - 8, 6);
              }}>
                <KonvaImage
                  image={photoImage}
                  x={4}
                  y={4}
                  width={PHOTO_PREVIEW_WIDTH - 8}
                  height={PHOTO_PREVIEW_HEIGHT - 8}
                />
              </Group>
            </Group>
          )}
        </Group>
      );
    }

    // Check if this is a date-range moment
    const hasDateRange = moment.endTime && moment.endTime > moment.timestamp;
    
    // Collapsed bubble view
    return (
      <Group
        x={bubbleX}
        y={bubbleY}
        draggable
        dragBoundFunc={(pos) => ({
          x: bubbleX,
          y: pos.y,
        })}
        onDragEnd={(e) => {
          // Update Y based on drag, accounting for bubble center offset
          const newY = e.target.y() - (moment.y < timelineY ? cardHeight / 2 : cardHeight / 2);
          updateMomentY(moment.id, newY + moment.y - bubbleY);
        }}
        onClick={handleCardClick}
        onTap={handleBubbleTap}
        onMouseEnter={() => setIsHovered(true)}
      >
        {/* Connecting lines to timeline - two lines for date-range moments */}
        {hasDateRange ? (
          <>
            {/* Start line */}
            <Line
              points={[startX - bubbleX, 0, startX - bubbleX, timelineY - bubbleY]}
              stroke={lineColor}
              strokeWidth={2}
              listening={false}
            />
            {/* End line */}
            <Line
              points={[endX - bubbleX, 0, endX - bubbleX, timelineY - bubbleY]}
              stroke={lineColor}
              strokeWidth={2}
              listening={false}
            />
          </>
        ) : (
          <Line
            points={[0, 0, 0, timelineY - bubbleY]}
            stroke={lineColor}
            strokeWidth={2}
            listening={false}
          />
        )}
        
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Card background with modern styling */}
        <Rect
          width={cardWidth}
          height={cardHeight}
          fill="#ffffff"
          cornerRadius={CARD_RADIUS}
          shadowColor="rgba(0,0,0,0.06)"
          shadowBlur={16}
          shadowOffsetY={4}
        />
        
        {/* Subtle accent background on hover */}
        {isHovered && (
          <Rect
            width={cardWidth}
            height={cardHeight}
            fill={accentColorLight}
            cornerRadius={CARD_RADIUS}
            opacity={0.4}
          />
        )}
        
        {/* Category accent bar - sleeker */}
        <Rect
          x={0}
          y={0}
          width={4}
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
        
        {/* Description - contained within box with ellipsis */}
        <Text
          x={PADDING_X}
          y={cardHeight > 44 ? 12 : Math.max(6, cardHeight / 2 - 7)}
          width={Math.max(10, cardWidth - (photoImage && cardHeight >= 50 ? 64 : PADDING_X + 8))}
          height={Math.max(14, cardHeight - (moment.people && cardHeight >= 48 ? 32 : PADDING_Y * 2))}
          text={moment.description || 'Untitled moment'}
          fontSize={cardHeight < 50 ? Math.max(9, Math.min(13, cardHeight / 4.5)) : 13}
          fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          fontStyle="600"
          fill="#1a1f2e"
          ellipsis
          wrap="word"
        />
        
        {/* People - only show if card is tall enough */}
        {moment.people && cardHeight >= 48 && (
          <Text
            x={PADDING_X}
            y={cardHeight < 64 ? Math.max(26, cardHeight - 24) : 32}
            width={Math.max(10, cardWidth - (photoImage && cardHeight >= 50 ? 64 : 40))}
            text={moment.people}
            fontSize={cardHeight < 64 ? Math.max(8, Math.min(11, cardHeight / 6)) : 11}
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            fill="#64748b"
            ellipsis
            wrap="none"
          />
        )}
        
        {/* Location - only show if card is tall enough */}
        {moment.location && cardHeight >= 64 && (
          <Text
            x={PADDING_X}
            y={cardHeight < 84 ? Math.max(42, cardHeight - 20) : (moment.people ? 48 : 32)}
            width={Math.max(10, cardWidth - (photoImage && cardHeight >= 50 ? 64 : 40))}
            text={`📍 ${moment.location}`}
            fontSize={cardHeight < 84 ? Math.max(8, Math.min(10, cardHeight / 8)) : 10}
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            fill="#94a3b8"
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
        
        {/* Photo preview below card on hover */}
        {isHovered && photoImage && (
          <Group
            x={(cardWidth - PHOTO_PREVIEW_WIDTH) / 2}
            y={cardHeight + 8}
          >
            <Rect
              width={PHOTO_PREVIEW_WIDTH}
              height={PHOTO_PREVIEW_HEIGHT}
              fill="#ffffff"
              cornerRadius={8}
              shadowColor="rgba(0,0,0,0.15)"
              shadowBlur={12}
              shadowOffsetY={4}
            />
            <Group clipFunc={(ctx) => {
              ctx.roundRect(4, 4, PHOTO_PREVIEW_WIDTH - 8, PHOTO_PREVIEW_HEIGHT - 8, 6);
            }}>
              <KonvaImage
                image={photoImage}
                x={4}
                y={4}
                width={PHOTO_PREVIEW_WIDTH - 8}
                height={PHOTO_PREVIEW_HEIGHT - 8}
              />
            </Group>
          </Group>
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