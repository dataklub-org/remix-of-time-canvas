import { format, isToday, isYesterday, isTomorrow } from 'date-fns';
import { getTimeUnit } from './timeUtils';

export function formatTickLabel(timestamp: number, msPerPixel: number): string {
  const date = new Date(timestamp);
  const unit = getTimeUnit(msPerPixel);
  
  switch (unit) {
    case '5min':
    case '10min':
    case '30min':
    case 'hour':
    case '6hour':
      return format(date, 'HH:mm');
    case 'day':
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      if (isTomorrow(date)) return 'Tomorrow';
      return format(date, 'MMM d\nEEE');
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
