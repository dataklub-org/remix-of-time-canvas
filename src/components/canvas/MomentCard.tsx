import { Group, Rect, Text } from 'react-konva';
import type { Moment } from '@/types/moment';
import { timeToX } from '@/utils/timeUtils';
import { useMomentsStore } from '@/stores/useMomentsStore';

interface MomentCardProps {
  moment: Moment;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: (moment: Moment) => void;
}

const CARD_WIDTH = 180;
const CARD_HEIGHT = 70;
const CARD_RADIUS = 8;

export function MomentCard({ moment, canvasWidth, canvasHeight, onSelect }: MomentCardProps) {
  const { canvasState, updateMomentY } = useMomentsStore();
  const { centerTime, msPerPixel } = canvasState;
  
  const x = timeToX(moment.timestamp, centerTime, msPerPixel, canvasWidth);
  
  // Color based on category
  const accentColor = moment.category === 'business' ? '#4a7dff' : '#f5a623';
  
  // Check if card is visible (with some buffer)
  const isVisible = x >= -CARD_WIDTH && x <= canvasWidth + CARD_WIDTH;
  
  if (!isVisible) return null;

  const handleDragEnd = (e: any) => {
    updateMomentY(moment.id, e.target.y());
  };

  return (
    <Group
      x={x - CARD_WIDTH / 2}
      y={moment.y}
      draggable
      dragBoundFunc={(pos) => ({
        x: x - CARD_WIDTH / 2, // Lock X position
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
  );
}
