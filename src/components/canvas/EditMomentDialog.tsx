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
  const [duration, setDuration] = useState<string>('');
  const [period, setPeriod] = useState<'m' | 'h' | 'd' | 'M'>('h');
  const [photo, setPhoto] = useState<string | null>(null);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(true); // Start expanded for edit mode
  
  // Autosave function
  const saveChanges = useCallback(() => {
    if (!moment) return;
    
    // Parse timestamp from date and time inputs
    if (!dateInput || !timeInput) return;
    
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
      endTime = parsedTimestamp + durationMs;
    }
    
    updateMoment(moment.id, {
      timestamp: parsedTimestamp,
      description,
      people: people.join(', '),
      location,
      category,
      memorable,
      endTime,
      photo: photo || undefined,
    });
  }, [moment, dateInput, timeInput, description, people, location, category, memorable, duration, period, photo, updateMoment]);

  // Autosave on changes (debounced)
  useEffect(() => {
    if (!moment) return;
    const timer = setTimeout(() => {
      saveChanges();
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, people, location, category, memorable, dateInput, timeInput, duration, period, photo, saveChanges, moment]);
  
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
      
      // Calculate duration and period from endTime
      if (moment.endTime && moment.endTime > moment.timestamp) {
        const diffMs = moment.endTime - moment.timestamp;
        const diffMinutes = diffMs / (60 * 1000);
        const diffHours = diffMs / (60 * 60 * 1000);
        const diffDays = diffMs / (24 * 60 * 60 * 1000);
        const diffMonths = diffMs / (30 * 24 * 60 * 60 * 1000);
        
        // Choose the most appropriate period
        if (diffMonths >= 1 && diffMonths === Math.floor(diffMonths)) {
          setDuration(diffMonths.toString());
          setPeriod('M');
        } else if (diffDays >= 1 && diffDays === Math.floor(diffDays)) {
          setDuration(diffDays.toString());
          setPeriod('d');
        } else if (diffHours >= 1) {
          setDuration(parseFloat(diffHours.toFixed(2)).toString());
          setPeriod('h');
        } else {
          setDuration(parseFloat(diffMinutes.toFixed(1)).toString());
          setPeriod('m');
        }
      } else {
        setDuration('');
        setPeriod('h');
      }
      
      // Focus and select description field
      setTimeout(() => {
        if (descriptionRef.current) {
          descriptionRef.current.focus();
          descriptionRef.current.select();
        }
      }, 100);
    }
  }, [moment?.id]); // Only trigger on moment id change, not on updates

  if (!moment) return null;

  const handleDelete = () => {
    deleteMoment(moment.id);
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
      duration={duration}
      setDuration={setDuration}
      period={period}
      setPeriod={setPeriod}
      photo={photo}
      setPhoto={setPhoto}
      moreDetailsOpen={moreDetailsOpen}
      setMoreDetailsOpen={setMoreDetailsOpen}
      onDelete={handleDelete}
      onMemento={handleMemento}
      onCancel={onClose}
      descriptionRef={descriptionRef}
    />
  );

  // Mobile: Use bottom sheet for better keyboard handling
  if (isMobile) {
    return (
      <Sheet open={!!moment} onOpenChange={() => onClose()}>
        <SheetContent 
          side="bottom" 
          className="h-[90dvh] rounded-t-2xl px-6 pt-6 pb-4 flex flex-col"
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
