import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users2, Baby as BabyIcon, Loader2 } from 'lucide-react';
import { Group } from '@/hooks/useGroups';
import type { Baby } from '@/types/baby';

interface ShareItem {
  id: string;
  name: string;
  type: 'group' | 'baby';
  memberCount?: number;
}

interface ShareSelectorProps {
  groups: Group[];
  babies: Baby[];
  sharedGroupIds: Set<string>;
  sharedBabyIds: Set<string>;
  onShareToGroup: (groupId: string) => Promise<void>;
  onShareToBaby: (babyId: string) => Promise<void>;
  label?: string;
}

export function ShareSelector({
  groups,
  babies,
  sharedGroupIds,
  sharedBabyIds,
  onShareToGroup,
  onShareToBaby,
  label = 'Share to',
}: ShareSelectorProps) {
  const [sharingId, setSharingId] = useState<string | null>(null);

  // Combine groups and babies into a single list
  const items: ShareItem[] = [
    ...groups.map((g) => ({
      id: g.id,
      name: g.name,
      type: 'group' as const,
      memberCount: g.memberCount,
    })),
    ...babies.map((b) => ({
      id: b.id,
      name: b.name,
      type: 'baby' as const,
    })),
  ];

  if (items.length === 0) {
    return null;
  }

  const handleToggle = async (item: ShareItem) => {
    // Check if already shared
    const isShared =
      item.type === 'group'
        ? sharedGroupIds.has(item.id)
        : sharedBabyIds.has(item.id);

    // If already shared, do nothing (we don't unshare)
    if (isShared) return;

    setSharingId(item.id);
    try {
      if (item.type === 'group') {
        await onShareToGroup(item.id);
      } else {
        await onShareToBaby(item.id);
      }
    } finally {
      setSharingId(null);
    }
  };

  const isShared = (item: ShareItem) =>
    item.type === 'group'
      ? sharedGroupIds.has(item.id)
      : sharedBabyIds.has(item.id);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <Users2 className="h-4 w-4" />
        {label}
      </Label>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const shared = isShared(item);
          const isLoading = sharingId === item.id;

          return (
            <label
              key={`${item.type}-${item.id}`}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                shared
                  ? 'bg-muted/50 border-primary/30 cursor-default'
                  : 'cursor-pointer hover:bg-muted/50'
              } ${isLoading ? 'opacity-70' : ''}`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Checkbox
                  checked={shared}
                  onCheckedChange={() => handleToggle(item)}
                  disabled={shared || isLoading}
                />
              )}
              <span className="flex items-center gap-1.5 text-sm">
                {item.type === 'baby' ? (
                  <BabyIcon className="h-3.5 w-3.5 text-baby" />
                ) : null}
                {item.name}
              </span>
              {item.type === 'group' && item.memberCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({item.memberCount})
                </span>
              )}
              {shared && (
                <span className="text-xs text-muted-foreground ml-1">✓</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
