import { useMemo } from 'react';
import { Line, Text, Group, Rect } from 'react-konva';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { timeToX, getTickInterval, getTimeUnit, ZOOM_LEVELS, getZoomLevelIndex } from '@/utils/timeUtils';
import { formatTickLabel } from '@/utils/formatUtils';
import { format, isWeekend, startOfMonth, eachDayOfInterval, startOfDay, endOfDay, isSunday } from 'date-fns';

interface TimeAxisProps {
  width: number;
  height: number;
  timelineY?: number;
}

export function TimeAxis({ width, height, timelineY }: TimeAxisProps) {
  const { canvasState } = useMomentsStore();
  const { centerTime, msPerPixel } = canvasState;
  
  const axisY = timelineY ?? height / 2;
  
  // Get the current zoom level index and interpolate for smooth transitions
  const zoomIndex = getZoomLevelIndex(msPerPixel);
  const currentLevel = ZOOM_LEVELS[zoomIndex];
  const timeUnit = currentLevel.unit;
  
  // Check if we're at a sub-day level (anything less than full day)
  const isSubDayLevel = ['5min', '10min', '30min', 'hour', '6hour'].includes(timeUnit);
  const isWeekLevel = timeUnit === 'week';
  
  // Generate visible ticks - updates dynamically with msPerPixel
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

  // Generate weekend highlights for week view or higher (week, month, year)
  const isWeekOrHigher = ['week', 'month', 'year'].includes(timeUnit);
  
  const weekendHighlights = useMemo(() => {
    if (!isWeekOrHigher) return [];
    
    const visibleTimeRange = width * msPerPixel;
    const startTime = centerTime - visibleTimeRange / 2;
    const endTime = centerTime + visibleTimeRange / 2;
    
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days
      .filter(day => isWeekend(day))
      .map(day => ({
        start: startOfDay(day).getTime(),
        end: endOfDay(day).getTime(),
        label: format(day, 'EEE'),
        isSunday: isSunday(day),
        dateLabel: format(day, 'MMM d'),
      }));
  }, [centerTime, msPerPixel, width, isWeekOrHigher]);

  // Generate month boundaries for week view or higher
  const monthBoundaries = useMemo(() => {
    if (!isWeekOrHigher) return [];
    
    const visibleTimeRange = width * msPerPixel;
    const startTime = centerTime - visibleTimeRange / 2;
    const endTime = centerTime + visibleTimeRange / 2;
    
    const boundaries: { timestamp: number; label: string }[] = [];
    
    let currentDate = startOfMonth(new Date(startTime));
    while (currentDate.getTime() <= endTime) {
      const monthStart = startOfMonth(currentDate);
      if (monthStart.getTime() >= startTime && monthStart.getTime() <= endTime) {
        boundaries.push({
          timestamp: monthStart.getTime(),
          label: format(monthStart, 'MMMM yyyy'),
        });
      }
      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    
    return boundaries;
  }, [centerTime, msPerPixel, width, isWeekOrHigher]);

  // Now indicator
  const nowX = timeToX(Date.now(), centerTime, msPerPixel, width);
  const nowVisible = nowX >= 0 && nowX <= width;
  
  // Date indicator for center of timeline (for sub-day views)
  const centerDate = new Date(centerTime);
  const dateLabel = format(centerDate, 'EEEE, MMM d, yyyy');

  return (
    <Group>
      {/* Weekend highlights for week view */}
      {weekendHighlights.map((weekend) => {
        const startX = timeToX(weekend.start, centerTime, msPerPixel, width);
        const endX = timeToX(weekend.end, centerTime, msPerPixel, width);
        const rectWidth = endX - startX;
        const centerX = startX + rectWidth / 2;
        
        return (
          <Group key={weekend.start}>
            <Rect
              x={startX}
              y={axisY - 40}
              width={rectWidth}
              height={80}
              fill="rgba(147, 51, 234, 0.08)"
              cornerRadius={4}
            />
            {/* Show Sunday label with date at week zoom or higher */}
            {weekend.isSunday && isWeekOrHigher && (
              <Text
                text={`Sun\n${weekend.dateLabel}`}
                x={centerX - 25}
                y={axisY - 30}
                width={50}
                align="center"
                fontSize={10}
                fill="#9333ea"
                fontFamily="Inter, sans-serif"
                fontStyle="bold"
              />
            )}
          </Group>
        );
      })}
      
      {/* Month boundary indicators for week view */}
      {monthBoundaries.map((boundary) => {
        const x = timeToX(boundary.timestamp, centerTime, msPerPixel, width);
        
        return (
          <Group key={boundary.timestamp} x={x}>
            <Line
              points={[0, axisY - 50, 0, axisY + 50]}
              stroke="#9333ea"
              strokeWidth={2}
              dash={[4, 4]}
            />
            <Text
              text={boundary.label}
              x={5}
              y={axisY - 55}
              fontSize={12}
              fill="#9333ea"
              fontFamily="Inter, sans-serif"
              fontStyle="bold"
            />
          </Group>
        );
      })}
      
      {/* Main axis line */}
      <Line
        points={[0, axisY, width, axisY]}
        stroke="#b0b8c4"
        strokeWidth={1}
      />
      
      {/* Time ticks */}
      {ticks.map((timestamp) => {
        const x = timeToX(timestamp, centerTime, msPerPixel, width);
        const date = new Date(timestamp);
        const isWeekendDay = isWeekOrHigher && isWeekend(date);
        const isSundayDay = isSunday(date);
        
        // Skip rendering tick for Sundays at week level since we show the label in weekend highlight
        if (isWeekOrHigher && isSundayDay) return null;
        
        return (
          <Group key={timestamp} x={x}>
            <Line
              points={[0, axisY - 6, 0, axisY + 6]}
              stroke={isWeekendDay ? '#9333ea' : '#b0b8c4'}
              strokeWidth={isWeekendDay ? 2 : 1}
            />
            <Text
              text={formatTickLabel(timestamp, msPerPixel)}
              x={-30}
              y={axisY + 12}
              width={60}
              align="center"
              fontSize={11}
              fill={isWeekendDay ? '#9333ea' : '#7a8494'}
              fontFamily="Inter, sans-serif"
              fontStyle={isWeekendDay ? 'bold' : 'normal'}
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
