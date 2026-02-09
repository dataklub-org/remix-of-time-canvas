import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users2 } from 'lucide-react';
import { Group } from '@/hooks/useGroups';

interface GroupShareSelectorProps {
  groups: Group[];
  selectedGroupIds: string[];
  onSelectionChange: (groupIds: string[]) => void;
  label?: string;
}

export function GroupShareSelector({
  groups,
  selectedGroupIds,
  onSelectionChange,
  label = 'Share to groups',
}: GroupShareSelectorProps) {
  if (groups.length === 0) {
    return null;
  }

  const toggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      onSelectionChange(selectedGroupIds.filter(id => id !== groupId));
    } else {
      onSelectionChange([...selectedGroupIds, groupId]);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <Users2 className="h-4 w-4" />
        {label}
      </Label>
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <label
            key={group.id}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={selectedGroupIds.includes(group.id)}
              onCheckedChange={() => toggleGroup(group.id)}
            />
            <span className="text-sm">{group.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
