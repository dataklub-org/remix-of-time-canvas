import { useState, useRef } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, setHours, setMinutes, setSeconds, setMilliseconds, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Swipeable calendar component for mobile
function SwipeableCalendar({ onSelect, onClose }: { onSelect: (date: Date) => void; onClose: () => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    
    if (diff > threshold) {
      // Swipe left - next month
      setCurrentMonth(prev => addMonths(prev, 1));
    } else if (diff < -threshold) {
      // Swipe right - previous month
      setCurrentMonth(prev => subMonths(prev, 1));
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };
  
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onSelect(date);
  };
  
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  
  // Get the day of week the month starts on (0 = Sunday)
  const startDay = getDay(startOfMonth(currentMonth));
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div 
      className="p-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Swipe hint */}
      <p className="text-xs text-muted-foreground text-center mb-3">
        Swipe left/right to change months
      </p>
      
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}
        
        {/* Day cells */}
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={`
                h-10 w-full rounded-lg text-sm font-medium transition-colors
                ${isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : isToday 
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted'
                }
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function JumpToDateButton() {
  const { setCenterTime } = useMomentsStore();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSelect = (selectedDate: Date) => {
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
    setCenterTime(noonDate.getTime());
    setOpen(false);
  };

  const button = (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full shadow-lg z-10 bg-background/90 backdrop-blur-sm"
      onClick={() => setOpen(true)}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <CalendarIcon className="h-4 w-4 mr-1.5" />
      Jump to Date
    </Button>
  );

  // Mobile: Use bottom sheet with swipeable calendar
  if (isMobile) {
    return (
      <>
        {button}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent 
            side="bottom" 
            className="rounded-t-2xl max-h-[80dvh]"
          >
            <SheetHeader className="pb-2">
              <SheetTitle>Jump to Date</SheetTitle>
            </SheetHeader>
            <SwipeableCalendar onSelect={handleSelect} onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Use popover with regular calendar
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {button}
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="end"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <SwipeableCalendar onSelect={handleSelect} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
