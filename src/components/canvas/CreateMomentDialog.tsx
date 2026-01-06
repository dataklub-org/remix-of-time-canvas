import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMomentsStore } from '@/stores/useMomentsStore';
import type { Category } from '@/types/moment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CreateMomentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timestamp: number;
  y: number;
}

export function CreateMomentDialog({ open, onOpenChange, timestamp, y }: CreateMomentDialogProps) {
  const { addMoment } = useMomentsStore();
  
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Category>('personal');
  const [endTimeInput, setEndTimeInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse endTime - if empty, it will be undefined (same as timestamp)
    let endTime: number | undefined;
    if (endTimeInput) {
      const date = new Date(timestamp);
      const [hours, minutes] = endTimeInput.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
      endTime = date.getTime();
      // If end time is before start time, assume next day
      if (endTime < timestamp) {
        endTime += 24 * 60 * 60 * 1000;
      }
    }
    
    addMoment({
      timestamp,
      endTime,
      y,
      description,
      people,
      location,
      category,
    });
    
    // Reset form
    setDescription('');
    setPeople('');
    setLocation('');
    setCategory('personal');
    setEndTimeInput('');
    onOpenChange(false);
  };

  const formattedTime = format(new Date(timestamp), 'MMM d, yyyy · HH:mm');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">New Moment</DialogTitle>
          <p className="text-sm text-muted-foreground">{formattedTime}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
            <Input
              id="people"
              placeholder="Who was there?"
              value={people}
              onChange={(e) => setPeople(e.target.value)}
            />
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
            <Label htmlFor="endTime">End Time (optional)</Label>
            <Input
              id="endTime"
              type="time"
              placeholder="HH:MM"
              value={endTimeInput}
              onChange={(e) => setEndTimeInput(e.target.value)}
            />
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
