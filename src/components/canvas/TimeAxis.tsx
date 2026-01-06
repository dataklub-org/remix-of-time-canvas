import { useMemo } from 'react';
import { Line, Text, Group, Rect } from 'react-konva';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { timeToX, getTickInterval, getTimeUnit, ZOOM_LEVELS, getZoomLevelIndex } from '@/utils/timeUtils';
import { formatTickLabel } from '@/utils/formatUtils';
import { format, isWeekend, startOfMonth, eachDayOfInterval, startOfDay, endOfDay, isSunday, isThursday, isSaturday } from 'date-fns';

interface TimeAxisProps {
  width: number;
  height: number;
  timelineY?: number;
}

// Minimum pixel distance between tick labels to prevent overlap
const MIN_TICK_SPACING = 50;

// Helper to get ordinal suffix
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function TimeAxis({ width, height, timelineY }: TimeAxisProps) {
  const { canvasState } = useMomentsStore();
  const { centerTime, msPerPixel } = canvasState;
  
  const axisY = timelineY ?? height / 2;
  
  // Get the current zoom level index and interpolate for smooth transitions
  const zoomIndex = getZoomLevelIndex(msPerPixel);
  const currentLevel = ZOOM_LEVELS[zoomIndex];
  const timeUnit = currentLevel.unit;
  
  // Check zoom levels
  const isSubDayLevel = ['5min', '10min', '30min', 'hour', '6hour'].includes(timeUnit);
  const isDayLevel = timeUnit === 'day';
  const isWeekLevel = timeUnit === 'week';
  const isMonthLevel = timeUnit === 'month';
  const isYearLevel = timeUnit === 'year';
  const isWeekOrHigher = ['week', 'month', 'year'].includes(timeUnit);

  // Generate smart ticks based on zoom level with overlap prevention
  const smartTicks = useMemo(() => {
    const visibleTimeRange = width * msPerPixel;
    const startTime = centerTime - visibleTimeRange / 2;
    const endTime = centerTime + visibleTimeRange / 2;
    
    interface TickInfo {
      timestamp: number;
      label: string;
      priority: number; // Higher = more important, won't be removed
      isMonth?: boolean;
      isSunday?: boolean;
      isSaturday?: boolean;
    }
    
    const allTicks: TickInfo[] = [];
    
    if (isYearLevel) {
      // Year level: Show months, 10th and 20th
      let currentDate = startOfMonth(new Date(startTime));
      while (currentDate.getTime() <= endTime) {
        const monthStart = startOfMonth(currentDate);
        if (monthStart.getTime() >= startTime - visibleTimeRange * 0.1) {
          // Add month label
          allTicks.push({
            timestamp: monthStart.getTime(),
            label: format(monthStart, 'MMM'),
            priority: 3,
            isMonth: true,
          });
          
          // Add 10th
          const tenth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 10);
          if (tenth.getTime() >= startTime && tenth.getTime() <= endTime) {
            allTicks.push({
              timestamp: tenth.getTime(),
              label: `10${getOrdinalSuffix(10)}`,
              priority: 1,
            });
          }
          
          // Add 20th
          const twentieth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 20);
          if (twentieth.getTime() >= startTime && twentieth.getTime() <= endTime) {
            allTicks.push({
              timestamp: twentieth.getTime(),
              label: `20${getOrdinalSuffix(20)}`,
              priority: 1,
            });
          }
        }
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }
    } else if (isMonthLevel) {
      // Month level: Show months and Sundays only
      // Add month boundaries first (higher priority)
      let currentDate = startOfMonth(new Date(startTime));
      while (currentDate.getTime() <= endTime) {
        const monthStart = startOfMonth(currentDate);
        if (monthStart.getTime() >= startTime - visibleTimeRange * 0.1) {
          allTicks.push({
            timestamp: monthStart.getTime(),
            label: format(monthStart, 'MMM yyyy'),
            priority: 3,
            isMonth: true,
          });
        }
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }
      
      // Add Sundays
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      days.filter(day => isSunday(day)).forEach(day => {
        const dayNum = day.getDate();
        allTicks.push({
          timestamp: startOfDay(day).getTime(),
          label: `Sun ${dayNum}${getOrdinalSuffix(dayNum)}`,
          priority: 2,
          isSunday: true,
        });
      });
    } else if (isWeekLevel) {
      // Week level: Show Thursday and Sunday, plus month boundaries
      // Add month boundaries (highest priority)
      let currentDate = startOfMonth(new Date(startTime));
      while (currentDate.getTime() <= endTime) {
        const monthStart = startOfMonth(currentDate);
        if (monthStart.getTime() >= startTime - visibleTimeRange * 0.1) {
          allTicks.push({
            timestamp: monthStart.getTime(),
            label: format(monthStart, 'MMM yyyy'),
            priority: 3,
            isMonth: true,
          });
        }
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }
      
      // Add Thursday and Sunday only
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      days.forEach(day => {
        const isSun = isSunday(day);
        const isThurs = isThursday(day);
        if (isSun || isThurs) {
          const dayNum = day.getDate();
          allTicks.push({
            timestamp: startOfDay(day).getTime(),
            label: isSun ? `Sun ${dayNum}${getOrdinalSuffix(dayNum)}` : `Thu ${dayNum}${getOrdinalSuffix(dayNum)}`,
            priority: isSun ? 2 : 1,
            isSunday: isSun,
          });
        }
      });
    } else if (isDayLevel) {
      // Day level: regular ticks with Sat/Sun styling info
      const interval = getTickInterval(msPerPixel);
      const firstTick = Math.ceil(startTime / interval) * interval;
      for (let t = firstTick; t <= endTime; t += interval) {
        const date = new Date(t);
        const isSat = isSaturday(date);
        const isSun = isSunday(date);
        allTicks.push({
          timestamp: t,
          label: formatTickLabel(t, msPerPixel),
          priority: 1,
          isSaturday: isSat,
          isSunday: isSun,
        });
      }
    } else {
      // Sub-day levels: regular ticks
      const interval = getTickInterval(msPerPixel);
      const firstTick = Math.ceil(startTime / interval) * interval;
      for (let t = firstTick; t <= endTime; t += interval) {
        allTicks.push({
          timestamp: t,
          label: formatTickLabel(t, msPerPixel),
          priority: 1,
        });
      }
    }
    
    // Sort by timestamp
    allTicks.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove overlapping ticks, keeping higher priority ones
    const filteredTicks: TickInfo[] = [];
    for (const tick of allTicks) {
      const x = timeToX(tick.timestamp, centerTime, msPerPixel, width);
      
      // Check if this tick overlaps with any already added tick
      let overlaps = false;
      let overlappingIndex = -1;
      
      for (let i = 0; i < filteredTicks.length; i++) {
        const existingX = timeToX(filteredTicks[i].timestamp, centerTime, msPerPixel, width);
        if (Math.abs(x - existingX) < MIN_TICK_SPACING) {
          overlaps = true;
          overlappingIndex = i;
          break;
        }
      }
      
      if (!overlaps) {
        filteredTicks.push(tick);
      } else if (overlappingIndex >= 0 && tick.priority > filteredTicks[overlappingIndex].priority) {
        // Replace lower priority tick with higher priority one
        filteredTicks[overlappingIndex] = tick;
      }
    }
    
    return filteredTicks;
  }, [centerTime, msPerPixel, width, timeUnit, isDayLevel, isWeekLevel, isMonthLevel, isYearLevel]);

  // Generate weekend highlights for week view or higher
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
      }));
  }, [centerTime, msPerPixel, width, isWeekOrHigher]);

  // Now indicator
  const nowX = timeToX(Date.now(), centerTime, msPerPixel, width);
  const nowVisible = nowX >= 0 && nowX <= width;
  
  // Date indicator for center of timeline (for sub-day views)
  const centerDate = new Date(centerTime);
  const dateLabel = format(centerDate, 'EEEE, MMM d, yyyy');

  return (
    <Group>
      {/* Weekend highlights */}
      {weekendHighlights.map((weekend) => {
        const startX = timeToX(weekend.start, centerTime, msPerPixel, width);
        const endX = timeToX(weekend.end, centerTime, msPerPixel, width);
        const rectWidth = endX - startX;
        
        return (
          <Rect
            key={weekend.start}
            x={startX}
            y={axisY - 40}
            width={rectWidth}
            height={80}
            fill="rgba(224, 215, 211, 0.3)"
            cornerRadius={4}
          />
        );
      })}
      
      {/* Main axis line */}
      <Line
        points={[0, axisY, width, axisY]}
        stroke="#b0b8c4"
        strokeWidth={1}
      />
      
      {/* Smart ticks with overlap prevention */}
      {smartTicks.map((tick) => {
        const x = timeToX(tick.timestamp, centerTime, msPerPixel, width);
        const isWeekendDay = tick.isSunday || tick.isSaturday;
        
        // Determine font style and color for day level Sat/Sun
        const isItalic = isDayLevel && (tick.isSaturday || tick.isSunday);
        const textColor = isDayLevel && tick.isSunday ? '#dc2626' : (tick.isMonth ? '#5a6577' : '#7a8494');
        const fontStyle = tick.isMonth ? 'bold' : (isItalic ? 'italic' : 'normal');
        
        return (
          <Group key={tick.timestamp} x={x}>
            <Line
              points={[0, axisY - 6, 0, axisY + 6]}
              stroke={isWeekendDay ? '#E0D7D3' : '#b0b8c4'}
              strokeWidth={tick.isMonth ? 2 : 1}
            />
            <Text
              text={tick.label}
              x={-35}
              y={axisY + 12}
              width={70}
              align="center"
              fontSize={tick.isMonth ? 12 : 11}
              fill={textColor}
              fontFamily="Inter, sans-serif"
              fontStyle={fontStyle}
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
