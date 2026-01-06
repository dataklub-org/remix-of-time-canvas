import { useMemo } from 'react';
import { Line, Text, Group } from 'react-konva';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { timeToX, getTickInterval } from '@/utils/timeUtils';
import { formatTickLabel } from '@/utils/formatUtils';

interface TimeAxisProps {
  width: number;
  height: number;
  timelineY?: number;
}

export function TimeAxis({ width, height, timelineY }: TimeAxisProps) {
  const { canvasState } = useMomentsStore();
  const { centerTime, msPerPixel } = canvasState;
  
  const axisY = timelineY ?? height / 2;
  
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
