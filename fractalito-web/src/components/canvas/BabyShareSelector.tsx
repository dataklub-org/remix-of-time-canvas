
//ifwe have multiple babys, we i post sth i wwant to chose between babies : share to emmas timeline or other 

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Baby as BabyIcon } from 'lucide-react';
import type { Baby } from '@/types/baby';

interface BabyShareSelectorProps {
  babies: Baby[];
  selectedBabyIds: string[];
  onSelectionChange: (babyIds: string[]) => void; //function we call whenevewr selection changes
  label?: string;
}

export function BabyShareSelector({
  babies,
  selectedBabyIds,
  onSelectionChange,
  label = 'Share to baby timeline',
}: BabyShareSelectorProps) {
  if (babies.length === 0) {
    return null;
  }

  const toggleBaby = (babyId: string) => {
    if (selectedBabyIds.includes(babyId)) {
      onSelectionChange(selectedBabyIds.filter(id => id !== babyId));
    } else {
      onSelectionChange([...selectedBabyIds, babyId]);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <BabyIcon className="h-4 w-4" />
        {label}
      </Label>
      <div className="flex flex-wrap gap-2">
        {babies.map((baby) => (
          <label
            key={baby.id}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={selectedBabyIds.includes(baby.id)}
              onCheckedChange={() => toggleBaby(baby.id)}
            />
            <span className="text-sm">{baby.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
