import { useMemo } from 'react';
import { Line, Text, Group } from 'react-konva';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { timeToX, getTickInterval, getTimeUnit } from '@/utils/timeUtils';
import { formatTickLabel } from '@/utils/formatUtils';
import { format } from 'date-fns';

interface TimeAxisProps {
  width: number;
  height: number;
  timelineY?: number;
}

export function TimeAxis({ width, height, timelineY }: TimeAxisProps) {
  const { canvasState } = useMomentsStore();
  const { centerTime, msPerPixel } = canvasState;
  
  const axisY = timelineY ?? height / 2;
  const timeUnit = getTimeUnit(msPerPixel);
  
  // Check if we're at a sub-day level (anything less than full day)
  const isSubDayLevel = ['5min', '10min', '30min', 'hour', '6hour'].includes(timeUnit);
  
  // Generate visible ticks
  const ticks = useMemo(() => {
    const interval = getTickInterval(msPerPixel);
    const visibleTimeRange = width * msPerPixel;
    const startTime = centerTime - visibleTimeRange / 2;
    const endTime = centerTime + visibleTimeRange / 2;
    
    // Align to interval
    const firstTick = Math.ceil(startTime / interval) * interval;
    
    const result: number[] = [];
    for (let t = firstTick; t <= endTime; t += interval) {
      result.push(t);
    }
    return result;
  }, [centerTime, msPerPixel, width]);

  // Now indicator
  const nowX = timeToX(Date.now(), centerTime, msPerPixel, width);
  const nowVisible = nowX >= 0 && nowX <= width;
  
  // Date indicator for center of timeline (for sub-day views)
  const centerDate = new Date(centerTime);
  const dateLabel = format(centerDate, 'EEEE, MMM d, yyyy');

  return (
    <Group>
      {/* Main axis line */}
      <Line
        points={[0, axisY, width, axisY]}
        stroke="#b0b8c4"
        strokeWidth={1}
      />
      
      {/* Time ticks */}
      {ticks.map((timestamp) => {
        const x = timeToX(timestamp, centerTime, msPerPixel, width);
        return (
          <Group key={timestamp} x={x}>
            <Line
              points={[0, axisY - 6, 0, axisY + 6]}
              stroke="#b0b8c4"
              strokeWidth={1}
            />
            <Text
              text={formatTickLabel(timestamp, msPerPixel)}
              x={-30}
              y={axisY + 12}
              width={60}
              align="center"
              fontSize={11}
              fill="#7a8494"
              fontFamily="Inter, sans-serif"
            />
          </Group>
        );
      })}
      
      {/* Date indicator for sub-day views */}
      {isSubDayLevel && (
        <Text
          text={dateLabel}
          x={width / 2 - 100}
          y={axisY + 32}
          width={200}
          align="center"
          fontSize={12}
          fill="#5a6577"
          fontFamily="Inter, sans-serif"
          fontStyle="500"
        />
      )}
      
      {/* Now indicator */}
      {nowVisible && (
        <Group x={nowX}>
          <Line
            points={[0, axisY - 20, 0, axisY + 20]}
            stroke="#4a7dff"
            strokeWidth={2}
          />
          <Text
            text="Now"
            x={-15}
            y={axisY - 34}
            width={30}
            align="center"
            fontSize={10}
            fill="#4a7dff"
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
          />
        </Group>
      )}
    </Group>
  );
}
