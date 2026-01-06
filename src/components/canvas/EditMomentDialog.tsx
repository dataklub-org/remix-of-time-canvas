import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMomentsStore } from '@/stores/useMomentsStore';
import type { Moment, Category } from '@/types/moment';
import { cn } from '@/lib/utils';
import { formatMomentTime } from '@/utils/formatUtils';
import { Trash2 } from 'lucide-react';

interface EditMomentDialogProps {
  moment: Moment | null;
  onClose: () => void;
}

export function EditMomentDialog({ moment, onClose }: EditMomentDialogProps) {
  const { updateMoment, deleteMoment } = useMomentsStore();
  
  const [description, setDescription] = useState(moment?.description || '');
  const [people, setPeople] = useState(moment?.people || '');
  const [location, setLocation] = useState(moment?.location || '');
  const [category, setCategory] = useState<Category>(moment?.category || 'personal');

  if (!moment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateMoment(moment.id, {
      description,
      people,
      location,
      category,
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
          <p className="text-sm text-muted-foreground">{formatMomentTime(moment.timestamp)}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
