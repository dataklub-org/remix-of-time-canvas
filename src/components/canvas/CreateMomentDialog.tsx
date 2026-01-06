import { useState, useEffect, useRef } from 'react';
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
import { X, Camera, Image } from 'lucide-react';

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
  const photoInputRef = useRef<HTMLInputElement>(null);
  
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress and convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 400; // Max dimension for thumbnail
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setPhoto(compressedBase64);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
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
    
    // Limit endTime to max 30 minutes from start
    if (endTime && endTime - parsedTimestamp > MAX_INITIAL_DURATION_MS) {
      endTime = parsedTimestamp + MAX_INITIAL_DURATION_MS;
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
    setDescription('');
    setPeople([]);
    setPersonInput('');
    setLocation('');
    setCategory('personal');
    setMemorable(false);
    setEndDateInput('');
    setEndTimeInput('');
    setPhoto(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pt-2 flex flex-row items-center justify-between sticky top-0 bg-background z-10 pb-2">
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
        
        <form id="create-moment-form" onSubmit={handleSubmit} className="space-y-3 mt-2 mb-2">
          <div className="space-y-1">
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea
              id="description"
              placeholder="What happened?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none min-h-[60px]"
              rows={2}
              autoFocus
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="people" className="text-sm">People</Label>
            <div className="flex gap-2">
              <Input
                id="people"
                placeholder="Add person..."
                value={personInput}
                onChange={(e) => setPersonInput(e.target.value)}
                onKeyDown={handlePersonKeyDown}
                className="flex-1 h-9"
              />
              <Button type="button" variant="outline" size="sm" onClick={addPerson}>
                Add
              </Button>
            </div>
            {people.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {people.map((person) => (
                  <Badge key={person} variant="secondary" className="gap-1 pr-1 text-xs">
                    {person}
                    <button
                      type="button"
                      onClick={() => removePerson(person)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="location" className="text-sm">Location</Label>
            <Input
              id="location"
              placeholder="Where was it?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-9"
            />
          </div>
          
          {/* Date & Time - Start */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="date" className="text-sm">Date</Label>
              <Input
                id="date"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="time" className="text-sm">Time</Label>
              <Input
                id="time"
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          
          {/* End Date & Time */}
          <div className="space-y-1">
            <Label className="text-sm">End Date & Time (optional)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                id="endDate"
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className="h-9"
              />
              <Input
                id="endTime"
                type="time"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                className="h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetEndTime}
                className="text-xs h-9"
              >
                Moment
              </Button>
            </div>
          </div>
          
          {/* Category + Memorable in same row */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-sm">Category</Label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setCategory('personal')}
                  className={cn(
                    "flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors",
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
                    "flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors",
                    category === 'business'
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  Business
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMemorable(!memorable)}
              className={cn(
                "flex items-center gap-0 px-2 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                memorable
                  ? "bg-white text-black border border-black"
                  : "bg-black"
              )}
            >
              <span className={memorable ? "text-black font-bold" : "text-white font-bold"}>M</span>
              <span className={memorable ? "text-black" : "text-black"}>emorable</span>
            </button>
          </div>
          
          {/* Photo upload */}
          <div className="space-y-1">
            <Label className="text-sm">Photo</Label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {photo ? (
              <div className="relative inline-block">
                <img src={photo} alt="Moment" className="h-20 w-20 object-cover rounded-md" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-1"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Camera</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (photoInputRef.current) {
                      photoInputRef.current.removeAttribute('capture');
                      photoInputRef.current.click();
                      photoInputRef.current.setAttribute('capture', 'environment');
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">Gallery</span>
                </Button>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
