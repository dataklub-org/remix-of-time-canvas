import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useMomentsStore } from '@/stores/useMomentsStore';
import type { Category } from '@/types/moment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { X } from 'lucide-react';

interface CreateMomentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timestamp: number;
  y: number;
}

export function CreateMomentDialog({ open, onOpenChange, timestamp, y }: CreateMomentDialogProps) {
  const { addMoment } = useMomentsStore();
  
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
  const [originalTimestamp, setOriginalTimestamp] = useState<number>(0);
  
  // Initialize date/time inputs when dialog opens
  useEffect(() => {
    if (open) {
      const date = new Date(timestamp);
      setDateInput(format(date, 'yyyy-MM-dd'));
      setTimeInput(format(date, 'HH:mm'));
      setOriginalTimestamp(timestamp);
    }
  }, [open, timestamp]);
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse timestamp from date and time inputs
    const [year, month, day] = dateInput.split('-').map(Number);
    const [hours, minutes] = timeInput.split(':').map(Number);
    const parsedTimestamp = new Date(year, month - 1, day, hours, minutes).getTime();
    
    // Parse endTime - if empty, it will be undefined (same as timestamp)
    let endTime: number | undefined;
    if (endDateInput && endTimeInput) {
      const [endYear, endMonth, endDay] = endDateInput.split('-').map(Number);
      const [endHours, endMinutes] = endTimeInput.split(':').map(Number);
      endTime = new Date(endYear, endMonth - 1, endDay, endHours, endMinutes).getTime();
    } else if (endTimeInput) {
      // Use same date as start if only time is provided
      const date = new Date(parsedTimestamp);
      const [endHours, endMinutes] = endTimeInput.split(':').map(Number);
      date.setHours(endHours, endMinutes, 0, 0);
      endTime = date.getTime();
      if (endTime < parsedTimestamp) {
        endTime += 24 * 60 * 60 * 1000;
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
    });
    
    // Reset form
    setDescription('');
    setPeople([]);
    setPersonInput('');
    setLocation('');
    setCategory('personal');
    setMemorable(false);
    setEndDateInput('');
    setEndTimeInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="pt-2 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-medium">New Moment</DialogTitle>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" form="create-moment-form">
              Create
            </Button>
          </div>
        </DialogHeader>
        
        <form id="create-moment-form" onSubmit={handleSubmit} className="space-y-4 mt-4 mb-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What happened?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="people">People</Label>
            <div className="flex gap-2">
              <Input
                id="people"
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
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Where was it?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>End Date & Time (optional)</Label>
            <div className="grid grid-cols-3 gap-3">
              <Input
                id="endDate"
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
              />
              <Input
                id="endTime"
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
          
          {/* Memorable toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMemorable(!memorable)}
              className={cn(
                "flex items-center gap-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                memorable
                  ? "bg-white text-black border border-black"
                  : "bg-black"
              )}
            >
              <span className={memorable ? "text-black font-bold" : "text-black font-bold"}>M</span>
              <span className={memorable ? "text-black" : "text-white"}>emorable</span>
            </button>
            <span className="text-xs text-muted-foreground">
              Shown on monthly & yearly views
            </span>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
