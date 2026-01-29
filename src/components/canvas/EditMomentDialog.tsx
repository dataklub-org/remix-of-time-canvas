import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { useMomentsStore } from '@/stores/useMomentsStore';
import type { Moment, Category } from '@/types/moment';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { MomentFormContent } from './MomentFormContent';
import { useGroups, useShareMoment } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
import { GroupShareSelector } from './GroupShareSelector';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EditMomentDialogProps {
  moment: Moment | null;
  onClose: () => void;
}

export function EditMomentDialog({ moment, onClose }: EditMomentDialogProps) {
  const { updateMoment, deleteMoment, setCenterTime, setMsPerPixel, loadGroupMoments } = useMomentsStore();
  const { user } = useAuth();
  const { groups } = useGroups(user?.id || null);
  const { shareMomentToGroup } = useShareMoment(user?.id || null);
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
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(true);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  
  // Autosave function
  const saveChanges = useCallback(async () => {
    if (!moment) return;
    
    if (!dateInput || !timeInput) return;
    
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
      setSelectedGroupIds([]);
      
      if (moment.endTime && moment.endTime > moment.timestamp) {
        setEndDateInput(format(new Date(moment.endTime), 'yyyy-MM-dd'));
        setEndTimeInput(format(new Date(moment.endTime), 'HH:mm'));
      } else {
        setEndDateInput('');
        setEndTimeInput('');
      }
      
      setTimeout(() => {
        if (descriptionRef.current) {
          descriptionRef.current.focus();
          const len = descriptionRef.current.value.length;
          descriptionRef.current.setSelectionRange(len, len);
        }
      }, 100);
    }
  }, [moment?.id]);

  if (!moment) return null;

  const handleDelete = async () => {
    await deleteMoment(moment.id);
    onClose();
  };

  const handleMemento = () => {
    const centerTime = moment.endTime 
      ? moment.timestamp + (moment.endTime - moment.timestamp) / 2 
      : moment.timestamp;
    setCenterTime(centerTime);
    setMsPerPixel(36_000);
    onClose();
  };

  const handleShareToGroups = async () => {
    if (selectedGroupIds.length === 0 || !moment) return;
    
    setSharing(true);
    try {
      for (const groupId of selectedGroupIds) {
        await shareMomentToGroup(groupId, {
          id: moment.id,
          timestamp: moment.timestamp,
          endTime: moment.endTime,
          y: moment.y,
          width: moment.width,
          height: moment.height,
          description: moment.description,
          people: moment.people,
          location: moment.location,
          category: moment.category,
          memorable: moment.memorable,
          photo: moment.photo,
        });
      }
      await loadGroupMoments();
      setSelectedGroupIds([]);
      toast.success(`Shared to ${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error sharing to groups:', error);
    } finally {
      setSharing(false);
    }
  };

  // Group share section for the form
  const groupShareSection = groups.length > 0 ? (
    <div className="space-y-3 pt-3 border-t border-border mt-3">
      <GroupShareSelector
        groups={groups}
        selectedGroupIds={selectedGroupIds}
        onSelectionChange={setSelectedGroupIds}
        label="Share to groups"
      />
      {selectedGroupIds.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShareToGroups}
          disabled={sharing}
          className="w-full"
        >
          {sharing ? 'Sharing...' : `Share to ${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? 's' : ''}`}
        </Button>
      )}
    </div>
  ) : null;

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
      groupShareSection={groupShareSection}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={!!moment} onOpenChange={() => onClose()}>
        <SheetContent 
          side="bottom" 
          className="max-h-[85dvh] h-auto rounded-t-2xl px-6 pt-4 pb-safe flex flex-col"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        >
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={!!moment} onOpenChange={() => onClose()}>
      <DialogContent 
        className="sm:max-w-xl h-[85vh] max-h-[85vh] overflow-hidden p-4 flex flex-col"
        aria-describedby={undefined}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Edit Moment</DialogTitle>
        </VisuallyHidden.Root>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
