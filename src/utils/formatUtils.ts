import { format, isToday, isYesterday, isTomorrow } from 'date-fns';
import { getTimeUnit } from './timeUtils';

// Get ordinal suffix for a day number
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function formatTickLabel(timestamp: number, msPerPixel: number): string {
  const date = new Date(timestamp);
  const unit = getTimeUnit(msPerPixel);
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  
  switch (unit) {
    case '5min':
    case '10min':
    case '30min':
    case 'hour':
    case '6hour':
      return format(date, 'HH:mm');
    case 'day':
      if (isToday(date)) return `Today\n${format(date, 'MMM')} ${day}${ordinal}`;
      if (isYesterday(date)) return `Yesterday\n${format(date, 'MMM')} ${day}${ordinal}`;
      if (isTomorrow(date)) return `Tomorrow\n${format(date, 'MMM')} ${day}${ordinal}`;
      return `${format(date, 'MMM')} ${day}${ordinal}\n${format(date, 'EEE')}`;
    case 'week':
      // Show day with ordinal and weekday
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) { // Sunday
        return `Sun ${day}${ordinal}`;
      }
      return `${day}${ordinal}`;
    case 'month':
      return format(date, 'MMM yyyy');
    case 'year':
      return format(date, 'yyyy');
  }
}

export function formatMomentTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) {
    return `Today at ${format(date, 'HH:mm')}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'HH:mm')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'HH:mm')}`;
  }
  return format(date, 'MMM d, yyyy · HH:mm');
}
