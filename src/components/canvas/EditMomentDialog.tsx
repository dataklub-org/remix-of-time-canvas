import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useMomentsStore } from '@/stores/useMomentsStore';
import type { Moment, Category } from '@/types/moment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Trash2, X } from 'lucide-react';

interface EditMomentDialogProps {
  moment: Moment | null;
  onClose: () => void;
}

export function EditMomentDialog({ moment, onClose }: EditMomentDialogProps) {
  const { updateMoment, deleteMoment } = useMomentsStore();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [personInput, setPersonInput] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Category>('personal');
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [originalTimestamp, setOriginalTimestamp] = useState<number>(0);
  
  // Autosave function
  const saveChanges = useCallback(() => {
    if (!moment) return;
    
    // Parse timestamp from date and time inputs
    if (!dateInput || !timeInput) return;
    
    const [year, month, day] = dateInput.split('-').map(Number);
    const [hours, minutes] = timeInput.split(':').map(Number);
    const parsedTimestamp = new Date(year, month - 1, day, hours, minutes).getTime();
    
    // Parse endTime
    let endTime: number | undefined;
    if (endDateInput && endTimeInput) {
      const [endYear, endMonth, endDay] = endDateInput.split('-').map(Number);
      const [endHours, endMinutes] = endTimeInput.split(':').map(Number);
      endTime = new Date(endYear, endMonth - 1, endDay, endHours, endMinutes).getTime();
    } else if (endTimeInput) {
      const date = new Date(parsedTimestamp);
      const [endHours, endMinutes] = endTimeInput.split(':').map(Number);
      date.setHours(endHours, endMinutes, 0, 0);
      endTime = date.getTime();
      if (endTime < parsedTimestamp) {
        endTime += 24 * 60 * 60 * 1000;
      }
    }
    
    updateMoment(moment.id, {
      timestamp: parsedTimestamp,
      description,
      people: people.join(', '),
      location,
      category,
      endTime,
    });
  }, [moment, dateInput, timeInput, description, people, location, category, endDateInput, endTimeInput, updateMoment]);

  // Autosave on changes (debounced)
  useEffect(() => {
    if (!moment) return;
    const timer = setTimeout(() => {
      saveChanges();
    }, 300);
    return () => clearTimeout(timer);
  }, [description, people, location, category, dateInput, timeInput, endDateInput, endTimeInput, saveChanges, moment]);
  
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
      setDateInput(format(new Date(moment.timestamp), 'yyyy-MM-dd'));
      setTimeInput(format(new Date(moment.timestamp), 'HH:mm'));
      setEndDateInput(moment.endTime ? format(new Date(moment.endTime), 'yyyy-MM-dd') : '');
      setEndTimeInput(moment.endTime ? format(new Date(moment.endTime), 'HH:mm') : '');
      setOriginalTimestamp(moment.timestamp);
      
      // Focus and select description field
      setTimeout(() => {
        if (descriptionRef.current) {
          descriptionRef.current.focus();
          descriptionRef.current.select();
        }
      }, 100);
    }
  }, [moment?.id]); // Only trigger on moment id change, not on updates
  
  const addPerson = () => {
    const trimmed = personInput.trim();
    if (trimmed && !people.includes(trimmed)) {
      setPeople([...people, trimmed]);
      setPersonInput('');
    }
  };
  
  const removePerson = (person: string) => {
    setPeople(people.filter(p => p !== person));
  };
  
  const handlePersonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPerson();
    }
  };
  
  const resetEndTime = () => {
    setEndDateInput('');
    setEndTimeInput('');
  };

  if (!moment) return null;

  const handleDelete = () => {
    deleteMoment(moment.id);
    onClose();
  };

  return (
    <Dialog open={!!moment} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="pt-2">
          <DialogTitle className="text-lg font-medium">Edit Moment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4 mb-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">Time</Label>
              <Input
                id="edit-time"
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              ref={descriptionRef}
              id="edit-description"
              placeholder="What happened?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-people">People</Label>
            <div className="flex gap-2">
              <Input
                id="edit-people"
                placeholder="Add person..."
                value={personInput}
                onChange={(e) => setPersonInput(e.target.value)}
                onKeyDown={handlePersonKeyDown}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addPerson}>
                Add
              </Button>
            </div>
            {people.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {people.map((person) => (
                  <Badge key={person} variant="secondary" className="gap-1 pr-1">
                    {person}
                    <button
                      type="button"
                      onClick={() => removePerson(person)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              placeholder="Where was it?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>End Date & Time (optional)</Label>
            <div className="grid grid-cols-3 gap-3">
              <Input
                id="edit-endDate"
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
              />
              <Input
                id="edit-endTime"
                type="time"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={resetEndTime}
                className="text-sm"
              >
                Moment
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Click "Moment" to reset to start time</p>
          </div>
          
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCategory('personal')}
                className={cn(
                  "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                  category === 'personal'
                    ? "bg-orange-100 text-orange-700 border-2 border-orange-300"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setCategory('business')}
                className={cn(
                  "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                  category === 'business'
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                Business
              </button>
            </div>
          </div>
          
          <div className="flex justify-between pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
