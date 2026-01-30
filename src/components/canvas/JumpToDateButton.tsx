import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { cn } from '@/lib/utils';

export function JumpToDateButton() {
  const { setCenterTime } = useMomentsStore();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Set time to 12:00 PM (noon) for the selected date
      const noonDate = setMilliseconds(
        setSeconds(
          setMinutes(
            setHours(selectedDate, 12),
            0
          ),
          0
        ),
        0
      );
      setDate(selectedDate);
      setCenterTime(noonDate.getTime());
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full shadow-lg z-10 bg-background/90 backdrop-blur-sm"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CalendarIcon className="h-4 w-4 mr-1.5" />
          Jump to Date
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="end"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
