import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { useMomentsStore } from '@/stores/useMomentsStore';
import { useGroups } from '@/hooks/useGroups';
import { useBabies, useShareMomentToBaby } from '@/hooks/useBabies';
import { useAuth } from '@/hooks/useAuth';
import type { Category } from '@/types/moment';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { MomentFormContent } from './MomentFormContent';
import { getDefaultMomentWidth } from '@/utils/timeUtils';
import { GroupShareSelector } from './GroupShareSelector';
import { BabyShareSelector } from './BabyShareSelector';

interface CreateMomentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timestamp: number;
  y: number;
}

export function CreateMomentDialog({ open, onOpenChange, timestamp, y }: CreateMomentDialogProps) {
  const { addMoment, addGroupMoment, canvasState, loadGroupMoments } = useMomentsStore();
  const { user, isAuthenticated } = useAuth();
  const { groups } = useGroups(user?.id || null);
  const { babies } = useBabies(user?.id || null);
  const { shareMomentToBaby } = useShareMomentToBaby(user?.id || null);
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
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedBabyIds, setSelectedBabyIds] = useState<string[]>([]);
  
  // Initialize date/time inputs when dialog opens
  useEffect(() => {
    if (open) {
      const date = new Date(timestamp);
      setDateInput(format(date, 'yyyy-MM-dd'));
      setTimeInput(format(date, 'HH:mm'));
      setSelectedGroupIds([]);
      setSelectedBabyIds([]);
    }
  }, [open, timestamp]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    
    // Calculate initial width based on current zoom level
    const initialWidth = getDefaultMomentWidth(canvasState.msPerPixel);
    
    const momentData = {
      timestamp: parsedTimestamp,
      endTime,
      y,
      description,
      people: people.join(', '),
      location,
      category,
      memorable,
      photo: photo || undefined,
      width: initialWidth,
    };
    
    // Always create in MyLife (personal timeline)
    await addMoment(momentData);
    
    // Also share to selected groups if any
    if (selectedGroupIds.length > 0 && isAuthenticated) {
      for (const groupId of selectedGroupIds) {
        await addGroupMoment(groupId, momentData);
      }
      await loadGroupMoments();
    }

    // Also share to selected babies if any
    if (selectedBabyIds.length > 0 && isAuthenticated) {
      for (const babyId of selectedBabyIds) {
        await shareMomentToBaby(babyId, momentData);
      }
    }
    
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
    setSelectedGroupIds([]);
    setSelectedBabyIds([]);
  };

  // Autosave when clicking away (backdrop click)
  const handleAutosave = async () => {
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
      
      // Calculate initial width based on current zoom level
      const initialWidth = getDefaultMomentWidth(canvasState.msPerPixel);
      
      const momentData = {
        timestamp: parsedTimestamp,
        endTime,
        y,
        description: description.trim(),
        people: people.join(', '),
        location,
        category,
        memorable,
        photo: photo || undefined,
        width: initialWidth,
      };
      
      // Always save to MyLife
      await addMoment(momentData);
      
      // Also share to selected groups
      if (selectedGroupIds.length > 0 && isAuthenticated) {
        for (const groupId of selectedGroupIds) {
          await addGroupMoment(groupId, momentData);
        }
        await loadGroupMoments();
      }

      // Also share to selected babies
      if (selectedBabyIds.length > 0 && isAuthenticated) {
        for (const babyId of selectedBabyIds) {
          await shareMomentToBaby(babyId, momentData);
        }
      }
    }
    
    resetForm();
    onOpenChange(false);
  };

  // X button: discard new moment (don't save)
  const handleDiscard = () => {
    resetForm();
    onOpenChange(false);
  };

  // Share section for create mode (groups and babies)
  const shareSection = isAuthenticated && (groups.length > 0 || babies.length > 0) ? (
    <div className="space-y-3 pt-3 border-t border-border mt-3">
      {groups.length > 0 && (
        <GroupShareSelector
          groups={groups}
          selectedGroupIds={selectedGroupIds}
          onSelectionChange={setSelectedGroupIds}
          label="Share to groups"
        />
      )}
      {babies.length > 0 && (
        <BabyShareSelector
          babies={babies}
          selectedBabyIds={selectedBabyIds}
          onSelectionChange={setSelectedBabyIds}
          label="Share to baby timeline"
        />
      )}
    </div>
  ) : null;

  const formContent = (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
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
          groupShareSection={shareSection}
        />
      </div>
    </div>
  );

  // Mobile: Use bottom sheet with proper keyboard handling
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleAutosave()}>
        <SheetContent 
          side="bottom" 
          className="h-[85dvh] max-h-[85dvh] rounded-t-2xl px-6 pt-4 flex flex-col"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
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
        className="sm:max-w-xl h-[85vh] max-h-[85vh] overflow-hidden p-4 flex flex-col"
        onCloseClick={handleDiscard}
        aria-describedby={undefined}
      >
        <VisuallyHidden.Root>
          <DialogTitle>New Moment</DialogTitle>
        </VisuallyHidden.Root>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
