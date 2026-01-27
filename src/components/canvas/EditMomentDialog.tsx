import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useMomentsStore } from '@/stores/useMomentsStore';
import type { Moment, Category } from '@/types/moment';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { MomentFormContent } from './MomentFormContent';

interface EditMomentDialogProps {
  moment: Moment | null;
  onClose: () => void;
}

export function EditMomentDialog({ moment, onClose }: EditMomentDialogProps) {
  const { updateMoment, deleteMoment, setCenterTime, setMsPerPixel } = useMomentsStore();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
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
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(true); // Start expanded for edit mode
  
  // Autosave function
  const saveChanges = useCallback(async () => {
    if (!moment) return;
    
    // Parse timestamp from date and time inputs
    if (!dateInput || !timeInput) return;
    
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
    
    await updateMoment(moment.id, {
      timestamp: parsedTimestamp,
      description,
      people: people.join(', '),
      location,
      category,
      memorable,
      endTime,
      photo: photo || undefined,
    });
  }, [moment, dateInput, timeInput, endDateInput, endTimeInput, description, people, location, category, memorable, photo, updateMoment]);

  // Autosave on changes (debounced)
  useEffect(() => {
    if (!moment) return;
    const timer = setTimeout(() => {
      saveChanges();
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, people, location, category, memorable, dateInput, timeInput, endDateInput, endTimeInput, photo, saveChanges, moment]);
  
  // Reset form when moment changes
  useEffect(() => {
    if (moment) {
      setDescription(moment.description || '');
      // Parse people string to array
      const peopleArray = moment.people 
        ? moment.people.split(',').map(p => p.trim()).filter(Boolean)
        : [];
      setPeople(peopleArray);
      setPersonInput('');
      setLocation(moment.location || '');
      setCategory(moment.category || 'personal');
      setMemorable(moment.memorable || false);
      setPhoto(moment.photo || null);
      setDateInput(format(new Date(moment.timestamp), 'yyyy-MM-dd'));
      setTimeInput(format(new Date(moment.timestamp), 'HH:mm'));
      
      // Set end date/time from endTime
      if (moment.endTime && moment.endTime > moment.timestamp) {
        setEndDateInput(format(new Date(moment.endTime), 'yyyy-MM-dd'));
        setEndTimeInput(format(new Date(moment.endTime), 'HH:mm'));
      } else {
        setEndDateInput('');
        setEndTimeInput('');
      }
      
      // Focus description field and place cursor at the end
      setTimeout(() => {
        if (descriptionRef.current) {
          descriptionRef.current.focus();
          // Move cursor to end instead of selecting all
          const len = descriptionRef.current.value.length;
          descriptionRef.current.setSelectionRange(len, len);
        }
      }, 100);
    }
  }, [moment?.id]); // Only trigger on moment id change, not on updates

  if (!moment) return null;

  const handleDelete = async () => {
    await deleteMoment(moment.id);
    onClose();
  };

  const handleMemento = () => {
    // Calculate center time (middle of moment if it has duration)
    const centerTime = moment.endTime 
      ? moment.timestamp + (moment.endTime - moment.timestamp) / 2 
      : moment.timestamp;
    setCenterTime(centerTime);
    setMsPerPixel(36_000); // Hourly zoom level
    onClose();
  };

  const formContent = (
    <MomentFormContent
      mode="edit"
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
      onDelete={handleDelete}
      onMemento={handleMemento}
      descriptionRef={descriptionRef}
    />
  );

  // Mobile: Use bottom sheet for better keyboard handling
  if (isMobile) {
    return (
      <Sheet open={!!moment} onOpenChange={() => onClose()}>
        <SheetContent 
          side="bottom" 
          className="h-[85dvh] rounded-t-2xl px-6 pt-4 pb-4 flex flex-col"
        >
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use dialog
  return (
    <Dialog open={!!moment} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden p-4 flex flex-col">
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
