import { useState } from 'react';
import { Share2, Loader2, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Group, useShareMoment } from '@/hooks/useGroups';
import { Moment } from '@/types/moment';

interface ShareToGroupDialogProps {
  moment: Moment;
  groups: Group[];
  userId: string | null;
  trigger?: React.ReactNode;
}

export function ShareToGroupDialog({
  moment,
  groups,
  userId,
  trigger,
}: ShareToGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const { shareMomentToGroup } = useShareMoment(userId);

  const handleShare = async (groupId: string) => {
    setSharing(groupId);
    const success = await shareMomentToGroup(groupId, moment);
    if (success) {
      setOpen(false);
    }
    setSharing(null);
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
          >
            <Share2 className="h-3 w-3" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share to Group
          </DialogTitle>
          <DialogDescription>
            Share this moment with a group. A copy will be added to the group's timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleShare(group.id)}
              disabled={sharing !== null}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{group.name}</span>
                <span className="text-xs text-muted-foreground">
                  {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                </span>
              </div>
              {sharing === group.id && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
