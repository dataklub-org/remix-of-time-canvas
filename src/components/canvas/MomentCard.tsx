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

const CARD_WIDTH = 180;
const CARD_HEIGHT = 70;
const CARD_RADIUS = 8;

export function MomentCard({ moment, canvasWidth, canvasHeight, onSelect, timelineY }: MomentCardProps) {
  const { canvasState, updateMomentY } = useMomentsStore();
  const { centerTime, msPerPixel } = canvasState;
  
  const startX = timeToX(moment.timestamp, centerTime, msPerPixel, canvasWidth);
  const endTime = moment.endTime || moment.timestamp;
  const endX = timeToX(endTime, centerTime, msPerPixel, canvasWidth);
  
  // Center the card between start and end
  const cardCenterX = (startX + endX) / 2;
  const cardLeft = cardCenterX - CARD_WIDTH / 2;
  const cardRight = cardCenterX + CARD_WIDTH / 2;
  const cardTop = moment.y;
  const cardBottom = moment.y + CARD_HEIGHT;
  
  // Color based on category
  const accentColor = moment.category === 'business' ? '#4a7dff' : '#f5a623';
  const lineColor = moment.category === 'business' ? 'rgba(74, 125, 255, 0.4)' : 'rgba(245, 166, 35, 0.4)';
  
  // Check if card is visible (with some buffer)
  const isVisible = cardRight >= -50 && cardLeft <= canvasWidth + 50;
  
  if (!isVisible) return null;

  const handleDragEnd = (e: any) => {
    updateMomentY(moment.id, e.target.y());
  };

  // Calculate bezier curve control points for smooth lines
  const isAboveTimeline = cardBottom < timelineY;
  const curveStrength = Math.abs(timelineY - (isAboveTimeline ? cardBottom : cardTop)) * 0.4;

  // Left line: from card corner to start timestamp on timeline
  const leftLineStart = { x: cardLeft, y: isAboveTimeline ? cardBottom : cardTop };
  const leftLineEnd = { x: startX, y: timelineY };
  
  // Right line: from card corner to end timestamp on timeline
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
          x: cardLeft, // Lock X position
          y: pos.y,
        })}
        onDragEnd={handleDragEnd}
        onClick={() => onSelect(moment)}
        onTap={() => onSelect(moment)}
      >
        {/* Card background */}
        <Rect
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
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
          width={4}
          height={CARD_HEIGHT}
          fill={accentColor}
          cornerRadius={[CARD_RADIUS, 0, 0, CARD_RADIUS]}
        />
        
        {/* Description */}
        <Text
          x={14}
          y={12}
          width={CARD_WIDTH - 24}
          text={moment.description || 'Untitled moment'}
          fontSize={13}
          fontFamily="Inter, sans-serif"
          fontStyle="500"
          fill="#2a3142"
          ellipsis
          wrap="none"
        />
        
        {/* People */}
        {moment.people && (
          <Text
            x={14}
            y={32}
            width={CARD_WIDTH - 24}
            text={moment.people}
            fontSize={11}
            fontFamily="Inter, sans-serif"
            fill="#7a8494"
            ellipsis
            wrap="none"
          />
        )}
        
        {/* Location */}
        {moment.location && (
          <Text
            x={14}
            y={48}
            width={CARD_WIDTH - 24}
            text={`📍 ${moment.location}`}
            fontSize={10}
            fontFamily="Inter, sans-serif"
            fill="#9aa3b2"
            ellipsis
            wrap="none"
          />
        )}
      </Group>
    </>
  );
}
