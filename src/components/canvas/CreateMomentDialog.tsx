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
  const [endDateInput, setEndDateInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
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
    
    // Calculate endTime from end date/time inputs
    let endTime: number | undefined;
    if (endDateInput && endTimeInput) {
      const [endYear, endMonth, endDay] = endDateInput.split('-').map(Number);
      const [endHours, endMinutes] = endTimeInput.split(':').map(Number);
      const parsedEndTime = new Date(endYear, endMonth - 1, endDay, endHours, endMinutes).getTime();
      if (parsedEndTime > parsedTimestamp) {
        endTime = parsedEndTime;
      }
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
    setEndDateInput('');
    setEndTimeInput('');
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
      if (endDateInput && endTimeInput) {
        const [endYear, endMonth, endDay] = endDateInput.split('-').map(Number);
        const [endHours, endMinutes] = endTimeInput.split(':').map(Number);
        const parsedEndTime = new Date(endYear, endMonth - 1, endDay, endHours, endMinutes).getTime();
        if (parsedEndTime > parsedTimestamp) {
          endTime = parsedEndTime;
        }
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
      endDateInput={endDateInput}
      setEndDateInput={setEndDateInput}
      endTimeInput={endTimeInput}
      setEndTimeInput={setEndTimeInput}
      photo={photo}
      setPhoto={setPhoto}
      moreDetailsOpen={moreDetailsOpen}
      setMoreDetailsOpen={setMoreDetailsOpen}
      onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
      autoFocusDescription
      isMobile={isMobile}
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
