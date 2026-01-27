import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useMomentsStore } from '@/stores/useMomentsStore';
import type { Category } from '@/types/moment';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { MomentFormContent } from './MomentFormContent';

interface CreateMomentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timestamp: number;
  y: number;
}

// Max 30 minutes for new moments
const MAX_INITIAL_DURATION_MS = 30 * 60 * 1000;

export function CreateMomentDialog({ open, onOpenChange, timestamp, y }: CreateMomentDialogProps) {
  const { addMoment } = useMomentsStore();
  const isMobile = useIsMobile();
  
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [personInput, setPersonInput] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Category>('personal');
  const [memorable, setMemorable] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [duration, setDuration] = useState<string>('');
  const [period, setPeriod] = useState<'m' | 'h' | 'd' | 'M'>('h');
  const [photo, setPhoto] = useState<string | null>(null);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  
  // Initialize date/time inputs when dialog opens
  useEffect(() => {
    if (open) {
      const date = new Date(timestamp);
      setDateInput(format(date, 'yyyy-MM-dd'));
      setTimeInput(format(date, 'HH:mm'));
    }
  }, [open, timestamp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse timestamp from date and time inputs
    const [year, month, day] = dateInput.split('-').map(Number);
    const [hours, minutes] = timeInput.split(':').map(Number);
    const parsedTimestamp = new Date(year, month - 1, day, hours, minutes).getTime();
    
    // Calculate endTime from duration and period
    let endTime: number | undefined;
    const durationNum = parseFloat(duration);
    if (!isNaN(durationNum) && durationNum > 0) {
      let durationMs = 0;
      switch (period) {
        case 'm': durationMs = durationNum * 60 * 1000; break;
        case 'h': durationMs = durationNum * 60 * 60 * 1000; break;
        case 'd': durationMs = durationNum * 24 * 60 * 60 * 1000; break;
        case 'M': durationMs = durationNum * 30 * 24 * 60 * 60 * 1000; break;
      }
      // Limit to max 30 minutes for new moments
      if (durationMs > MAX_INITIAL_DURATION_MS) {
        durationMs = MAX_INITIAL_DURATION_MS;
      }
      endTime = parsedTimestamp + durationMs;
    }
    
    addMoment({
      timestamp: parsedTimestamp,
      endTime,
      y,
      description,
      people: people.join(', '),
      location,
      category,
      memorable,
      photo: photo || undefined,
    });
    
    // Reset form
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setDescription('');
    setPeople([]);
    setPersonInput('');
    setLocation('');
    setCategory('personal');
    setMemorable(false);
    setDuration('');
    setPeriod('h');
    setPhoto(null);
    setMoreDetailsOpen(false);
  };

  // Autosave when clicking away (backdrop click)
  const handleAutosave = () => {
    if (description.trim()) {
      const [year, month, day] = dateInput.split('-').map(Number);
      const [hours, minutes] = timeInput.split(':').map(Number);
      const parsedTimestamp = new Date(year, month - 1, day, hours, minutes).getTime();
      
      let endTime: number | undefined;
      const durationNum = parseFloat(duration);
      if (!isNaN(durationNum) && durationNum > 0) {
        let durationMs = 0;
        switch (period) {
          case 'm': durationMs = durationNum * 60 * 1000; break;
          case 'h': durationMs = durationNum * 60 * 60 * 1000; break;
          case 'd': durationMs = durationNum * 24 * 60 * 60 * 1000; break;
          case 'M': durationMs = durationNum * 30 * 24 * 60 * 60 * 1000; break;
        }
        if (durationMs > MAX_INITIAL_DURATION_MS) {
          durationMs = MAX_INITIAL_DURATION_MS;
        }
        endTime = parsedTimestamp + durationMs;
      }
      
      addMoment({
        timestamp: parsedTimestamp,
        endTime,
        y,
        description: description.trim(),
        people: people.join(', '),
        location,
        category,
        memorable,
        photo: photo || undefined,
      });
    }
    
    resetForm();
    onOpenChange(false);
  };

  // X button: discard new moment (don't save)
  const handleDiscard = () => {
    resetForm();
    onOpenChange(false);
  };

  const formContent = (
    <MomentFormContent
      mode="create"
      description={description}
      setDescription={setDescription}
      people={people}
      setPeople={setPeople}
      personInput={personInput}
      setPersonInput={setPersonInput}
      location={location}
      setLocation={setLocation}
      category={category}
      setCategory={setCategory}
      memorable={memorable}
      setMemorable={setMemorable}
      dateInput={dateInput}
      setDateInput={setDateInput}
      timeInput={timeInput}
      setTimeInput={setTimeInput}
      duration={duration}
      setDuration={setDuration}
      period={period}
      setPeriod={setPeriod}
      photo={photo}
      setPhoto={setPhoto}
      moreDetailsOpen={moreDetailsOpen}
      setMoreDetailsOpen={setMoreDetailsOpen}
      autoFocusDescription
    />
  );

  // Mobile: Use bottom sheet for better keyboard handling
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleAutosave()}>
        <SheetContent 
          side="bottom" 
          className="h-auto max-h-[85dvh] rounded-t-2xl px-6 pt-4 pb-4 flex flex-col"
          onCloseClick={handleDiscard}
        >
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use dialog
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleAutosave()}>
      <DialogContent 
        className="sm:max-w-xl max-h-[85vh] overflow-hidden p-4 flex flex-col"
        onCloseClick={handleDiscard}
      >
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
