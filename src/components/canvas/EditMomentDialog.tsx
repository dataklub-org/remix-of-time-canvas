import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMomentsStore } from '@/stores/useMomentsStore';
import type { Moment, Category } from '@/types/moment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface EditMomentDialogProps {
  moment: Moment | null;
  onClose: () => void;
}

export function EditMomentDialog({ moment, onClose }: EditMomentDialogProps) {
  const { updateMoment, deleteMoment } = useMomentsStore();
  
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Category>('personal');
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  
  // Reset form when moment changes
  useEffect(() => {
    if (moment) {
      setDescription(moment.description || '');
      setPeople(moment.people || '');
      setLocation(moment.location || '');
      setCategory(moment.category || 'personal');
      setDateInput(format(new Date(moment.timestamp), 'yyyy-MM-dd'));
      setTimeInput(format(new Date(moment.timestamp), 'HH:mm'));
      setEndTimeInput(moment.endTime ? format(new Date(moment.endTime), 'HH:mm') : '');
    }
  }, [moment]);

  if (!moment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse timestamp from date and time inputs
    const [year, month, day] = dateInput.split('-').map(Number);
    const [hours, minutes] = timeInput.split(':').map(Number);
    const parsedTimestamp = new Date(year, month - 1, day, hours, minutes).getTime();
    
    // Parse endTime
    let endTime: number | undefined;
    if (endTimeInput) {
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
      people,
      location,
      category,
      endTime,
    });
    
    onClose();
  };

  const handleDelete = () => {
    deleteMoment(moment.id);
    onClose();
  };

  return (
    <Dialog open={!!moment} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Edit Moment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
            <Input
              id="edit-people"
              placeholder="Who was there?"
              value={people}
              onChange={(e) => setPeople(e.target.value)}
            />
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
            <Label htmlFor="edit-endTime">End Time (optional)</Label>
            <Input
              id="edit-endTime"
              type="time"
              value={endTimeInput}
              onChange={(e) => setEndTimeInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leave empty if same as start time</p>
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
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Save
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
