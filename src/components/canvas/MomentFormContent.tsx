import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import type { Category } from '@/types/moment';
import { cn } from '@/lib/utils';
import { X, Camera, Image, ChevronDown, Trash2, Crown } from 'lucide-react';
import mementoIcon from '@/assets/memento-icon.png';

interface MomentFormContentProps {
  mode: 'create' | 'edit';
  description: string;
  setDescription: (value: string) => void;
  people: string[];
  setPeople: (value: string[]) => void;
  personInput: string;
  setPersonInput: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  category: Category;
  setCategory: (value: Category) => void;
  memorable: boolean;
  setMemorable: (value: boolean) => void;
  dateInput: string;
  setDateInput: (value: string) => void;
  timeInput: string;
  setTimeInput: (value: string) => void;
  endDateInput: string;
  setEndDateInput: (value: string) => void;
  endTimeInput: string;
  setEndTimeInput: (value: string) => void;
  photo: string | null;
  setPhoto: (value: string | null) => void;
  moreDetailsOpen?: boolean;
  setMoreDetailsOpen?: (value: boolean) => void;
  onDelete?: () => void;
  onMemento?: () => void;
  onSubmit?: () => void;
  descriptionRef?: React.RefObject<HTMLTextAreaElement>;
  autoFocusDescription?: boolean;
  isMobile?: boolean;
}

export function MomentFormContent({
  mode,
  description,
  setDescription,
  people,
  setPeople,
  personInput,
  setPersonInput,
  location,
  setLocation,
  category,
  setCategory,
  memorable,
  setMemorable,
  dateInput,
  setDateInput,
  timeInput,
  setTimeInput,
  endDateInput,
  setEndDateInput,
  endTimeInput,
  setEndTimeInput,
  photo,
  setPhoto,
  moreDetailsOpen = false,
  setMoreDetailsOpen,
  onDelete,
  onMemento,
  onSubmit,
  descriptionRef,
  autoFocusDescription = false,
  isMobile = false,
}: MomentFormContentProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [keepOriginalSize, setKeepOriginalSize] = useState(false);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (keepOriginalSize) {
          // Pro feature: keep original size
          setPhoto(reader.result as string);
        } else {
          // Default: compress to max 400px
          const img = document.createElement('img');
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 400;
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
        }
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

  // Show collapsible for both create and edit modes when setMoreDetailsOpen is available
  const showCollapsible = setMoreDetailsOpen !== undefined;

  return (
    <div ref={formRef} className="flex flex-col h-full">
      {/* Drag handle for mobile sheets */}
      <div className="flex justify-center pt-1 pb-3 shrink-0 md:hidden">
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between py-3 px-1 border-b border-border shrink-0">
        <h2 className="text-lg font-medium">
          {mode === 'create' ? 'New Moment' : 'Edit Moment'}
        </h2>
        <div className="flex items-center gap-2">
          {mode === 'edit' && onMemento && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMemento}
              className="flex items-center gap-1 text-xs"
            >
              <img src={mementoIcon} alt="Memento" className="h-4 w-4" />
              Memento
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable form content */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-1 py-3"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        <div className="space-y-4">
          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              ref={descriptionRef}
              id="description"
              placeholder="What happened?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none min-h-[80px] text-base"
              rows={3}
              autoFocus={autoFocusDescription}
            />
          </div>

          {/* Create button for web - positioned below description */}
          {mode === 'create' && onSubmit && !isMobile && (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!description.trim()}
              className="w-full h-11"
            >
              Create
            </Button>
          )}

          {/* People */}
          <div className="space-y-1.5">
            <Label htmlFor="people" className="text-sm font-medium">People</Label>
            <div className="flex gap-2">
              <Input
                id="people"
                placeholder="Add person..."
                value={personInput}
                onChange={(e) => setPersonInput(e.target.value)}
                onKeyDown={handlePersonKeyDown}
                className="flex-1 h-11 text-base"
              />
              <Button type="button" variant="outline" size="sm" onClick={addPerson} className="h-11 px-4">
                +
              </Button>
            </div>
            {people.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {people.map((person) => (
                  <Badge key={person} variant="secondary" className="gap-1 pr-1 text-sm py-1">
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

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-sm font-medium">Location</Label>
            <Input
              id="location"
              placeholder="Where?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          {/* Date & Time - Stacked on mobile for better touch targets */}
          {showCollapsible ? (
            <Collapsible open={moreDetailsOpen} onOpenChange={setMoreDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="w-full flex items-center justify-center gap-1 text-muted-foreground">
                  <span className="text-sm">{moreDetailsOpen ? 'Less details' : 'More details'}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", moreDetailsOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
              <DateTimeFields
                  dateInput={dateInput}
                  setDateInput={setDateInput}
                  timeInput={timeInput}
                  setTimeInput={setTimeInput}
                  endDateInput={endDateInput}
                  setEndDateInput={setEndDateInput}
                  endTimeInput={endTimeInput}
                  setEndTimeInput={setEndTimeInput}
                />
                <CategorySection
                  category={category}
                  setCategory={setCategory}
                  memorable={memorable}
                  setMemorable={setMemorable}
                />
                <PhotoSection
                  photo={photo}
                  photoInputRef={photoInputRef}
                  handlePhotoChange={handlePhotoChange}
                  removePhoto={removePhoto}
                  keepOriginalSize={keepOriginalSize}
                  setKeepOriginalSize={setKeepOriginalSize}
                />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <>
              <DateTimeFields
                dateInput={dateInput}
                setDateInput={setDateInput}
                timeInput={timeInput}
                setTimeInput={setTimeInput}
                endDateInput={endDateInput}
                setEndDateInput={setEndDateInput}
                endTimeInput={endTimeInput}
                setEndTimeInput={setEndTimeInput}
              />
              <CategorySection
                category={category}
                setCategory={setCategory}
                memorable={memorable}
                setMemorable={setMemorable}
              />
              <PhotoSection
                photo={photo}
                photoInputRef={photoInputRef}
                handlePhotoChange={handlePhotoChange}
                removePhoto={removePhoto}
                keepOriginalSize={keepOriginalSize}
                setKeepOriginalSize={setKeepOriginalSize}
              />
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border py-3 px-1">
        {/* Create button for mobile - at bottom */}
        {mode === 'create' && onSubmit && isMobile && (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!description.trim()}
            className="w-full h-12 text-base font-medium"
          >
            Create
          </Button>
        )}
        
        {/* Delete button for edit mode */}
        {mode === 'edit' && onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Moment
          </Button>
        )}
      </div>
    </div>
  );
}

// Sub-components for cleaner organization
function DateTimeFields({
  dateInput,
  setDateInput,
  timeInput,
  setTimeInput,
  endDateInput,
  setEndDateInput,
  endTimeInput,
  setEndTimeInput,
}: {
  dateInput: string;
  setDateInput: (v: string) => void;
  timeInput: string;
  setTimeInput: (v: string) => void;
  endDateInput: string;
  setEndDateInput: (v: string) => void;
  endTimeInput: string;
  setEndTimeInput: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Start</Label>
        <Input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="h-11 text-base"
        />
        <Input
          type="time"
          value={timeInput}
          onChange={(e) => setTimeInput(e.target.value)}
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-muted-foreground">End (optional)</Label>
        <Input
          type="date"
          value={endDateInput}
          onChange={(e) => setEndDateInput(e.target.value)}
          className="h-11 text-base"
        />
        <Input
          type="time"
          value={endTimeInput}
          onChange={(e) => setEndTimeInput(e.target.value)}
          className="h-11 text-base"
        />
      </div>
    </div>
  );
}

function CategorySection({
  category,
  setCategory,
  memorable,
  setMemorable,
}: {
  category: Category;
  setCategory: (v: Category) => void;
  memorable: boolean;
  setMemorable: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCategory('personal')}
          className={cn(
            "py-2 px-4 rounded-md text-sm font-medium transition-colors",
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
            "py-2 px-4 rounded-md text-sm font-medium transition-colors",
            category === 'business'
              ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          Business
        </button>
      </div>
      <button
        type="button"
        onClick={() => setMemorable(!memorable)}
        className={cn(
          "flex items-center gap-0 px-3 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
          memorable
            ? "bg-white text-black border border-black"
            : "bg-black"
        )}
      >
        <span className={memorable ? "text-black font-bold" : "text-white font-bold"}>M</span>
        <span className={memorable ? "text-black" : "text-black"}>emorable</span>
      </button>
    </div>
  );
}

function PhotoSection({
  photo,
  photoInputRef,
  handlePhotoChange,
  removePhoto,
  keepOriginalSize,
  setKeepOriginalSize,
}: {
  photo: string | null;
  photoInputRef: React.RefObject<HTMLInputElement>;
  handlePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: () => void;
  keepOriginalSize: boolean;
  setKeepOriginalSize: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Photo</Label>
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
          <img src={photo} alt="Moment" className="h-24 w-24 object-cover rounded-md" />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => photoInputRef.current?.click()}
            className="flex items-center gap-2 h-11"
          >
            <Camera className="h-5 w-5" />
            Camera
          </Button>
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => {
              if (photoInputRef.current) {
                photoInputRef.current.removeAttribute('capture');
                photoInputRef.current.click();
                photoInputRef.current.setAttribute('capture', 'environment');
              }
            }}
            className="flex items-center gap-2 h-11"
          >
            <Image className="h-5 w-5" />
            Gallery
          </Button>
        </div>
      )}
      
      {/* Pro Feature: Keep Original Size */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          <div>
            <Label htmlFor="keep-original" className="text-sm font-medium cursor-pointer">
              Keep original size
            </Label>
            <p className="text-xs text-muted-foreground">Pro feature • Higher quality</p>
          </div>
        </div>
        <Switch
          id="keep-original"
          checked={keepOriginalSize}
          onCheckedChange={setKeepOriginalSize}
        />
      </div>
    </div>
  );
}
