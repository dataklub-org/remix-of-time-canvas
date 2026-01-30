import { useState } from 'react';
import { Baby, Plus, Trash2, Loader2, UserPlus, Crown, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBabies, PendingBabyInvitation } from '@/hooks/useBabies';
import type { Baby as BabyType, BabyAccessRole, AngelPermission } from '@/types/baby';
import { Connection } from '@/hooks/useConnections';
import { cn } from '@/lib/utils';

interface BabiesSectionProps {
  userId: string;
  connections: Connection[];
  defaultExpanded?: boolean;
}

export function BabiesSection({ userId, connections, defaultExpanded = false }: BabiesSectionProps) {
  const {
    babies,
    pendingInvitations,
    loading,
    createBaby,
    deleteBaby,
    inviteUser,
    acceptInvitation,
    declineInvitation,
  } = useBabies(userId);

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Baby className="h-4 w-4 text-baby" />
          <span className="font-medium">Babies</span>
          {babies.length > 0 && (
            <span className="text-xs bg-baby/20 text-baby-accent px-1.5 py-0.5 rounded-full">
              {babies.length}
            </span>
          )}
        </div>
        <CreateBabyDialog onCreateBaby={createBaby} />
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pending Invitations
          </h5>
          {pendingInvitations.map((inv) => (
            <PendingInvitationItem
              key={inv.id}
              invitation={inv}
              onAccept={() => acceptInvitation(inv.id)}
              onDecline={() => declineInvitation(inv.id)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : babies.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Create a baby timeline to track their early years.
        </p>
      ) : (
        <div className="space-y-2">
          {babies.map((baby) => (
            <BabyItem
              key={baby.id}
              baby={baby}
              onDelete={deleteBaby}
              onInvite={inviteUser}
              connections={connections}
              currentUserId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateBabyDialog({
  onCreateBaby,
}: {
  onCreateBaby: (data: {
    name: string;
    username: string;
    dateOfBirth: Date;
    timeOfBirth?: string;
    placeOfBirth?: string;
  }) => Promise<BabyType | null>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [timeOfBirth, setTimeOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !dateOfBirth) return;

    setCreating(true);
    const result = await onCreateBaby({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      dateOfBirth: new Date(dateOfBirth),
      timeOfBirth: timeOfBirth || undefined,
      placeOfBirth: placeOfBirth.trim() || undefined,
    });

    if (result) {
      setName('');
      setUsername('');
      setDateOfBirth('');
      setTimeOfBirth('');
      setPlaceOfBirth('');
      setOpen(false);
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Baby
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            Add Baby
          </DialogTitle>
          <DialogDescription>
            Create a dedicated timeline for your baby's first 3 years.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Baby's name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="unique_username"
              required
            />
            <p className="text-xs text-muted-foreground">
              Reserved for this baby's future account
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth *</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tob">Time of Birth (optional)</Label>
            <Input
              id="tob"
              type="time"
              value={timeOfBirth}
              onChange={(e) => setTimeOfBirth(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pob">Place of Birth (optional)</Label>
            <Input
              id="pob"
              value={placeOfBirth}
              onChange={(e) => setPlaceOfBirth(e.target.value)}
              placeholder="City, Hospital..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Baby Timeline
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BabyItem({
  baby,
  onDelete,
  onInvite,
  connections,
  currentUserId,
}: {
  baby: BabyType;
  onDelete: (id: string) => Promise<boolean>;
  onInvite: (babyId: string, userId: string, role: BabyAccessRole, permission?: AngelPermission) => Promise<boolean>;
  connections: Connection[];
  currentUserId: string;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState<BabyAccessRole>('angel');
  const [permission, setPermission] = useState<AngelPermission>('view');
  const [inviting, setInviting] = useState(false);

  const isCreator = baby.createdBy === currentUserId;
  const ageText = getAgeText(baby.dateOfBirth);

  const handleInvite = async () => {
    if (!selectedUserId) return;
    setInviting(true);
    const success = await onInvite(baby.id, selectedUserId, role, role === 'angel' ? permission : undefined);
    if (success) {
      setShowInvite(false);
      setSelectedUserId('');
    }
    setInviting(false);
  };

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-baby-secondary flex items-center justify-center">
            <Baby className="h-4 w-4 text-baby-accent" />
          </div>
          <div>
            <p className="font-medium text-sm">{baby.name}</p>
            <p className="text-xs text-muted-foreground">
              @{baby.username} · {ageText}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isCreator && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowInvite(!showInvite)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(baby.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {showInvite && (
        <div className="pt-2 border-t space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Invite from your circle</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.connectedUserId} value={conn.connectedUserId}>
                    @{conn.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as BabyAccessRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">
                  <div className="flex items-center gap-2">
                    <Crown className="h-3 w-3" />
                    Parent (full access)
                  </div>
                </SelectItem>
                <SelectItem value="angel">
                  <div className="flex items-center gap-2">
                    <Heart className="h-3 w-3" />
                    Angel (grandparent, caregiver)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === 'angel' && (
            <div className="space-y-2">
              <Label className="text-xs">Permission</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as AngelPermission)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View only</SelectItem>
                  <SelectItem value="contribute">Can add moments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            size="sm"
            className="w-full"
            onClick={handleInvite}
            disabled={!selectedUserId || inviting}
          >
            {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Invitation
          </Button>
        </div>
      )}
    </div>
  );
}

function PendingInvitationItem({
  invitation,
  onAccept,
  onDecline,
}: {
  invitation: PendingBabyInvitation;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const roleIcon = invitation.role === 'parent' ? Crown : Heart;
  const RoleIcon = roleIcon;

  return (
    <div className="p-3 border rounded-lg bg-baby-secondary/30 space-y-2">
      <div className="flex items-center gap-2">
        <Baby className="h-4 w-4 text-baby-accent" />
        <div className="flex-1">
          <p className="text-sm font-medium">{invitation.babyName}</p>
          <p className="text-xs text-muted-foreground">
            {invitation.inviterUsername && `@${invitation.inviterUsername} invited you as `}
            <span className="inline-flex items-center gap-1">
              <RoleIcon className="h-3 w-3" />
              {invitation.role}
            </span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onDecline}>
          Decline
        </Button>
        <Button size="sm" className="flex-1" onClick={onAccept}>
          Accept
        </Button>
      </div>
    </div>
  );
}

function getAgeText(dateOfBirth: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - dateOfBirth.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} old`;
  }
  
  const weeks = Math.floor(days / 7);
  if (weeks < 8) {
    return `${weeks} week${weeks !== 1 ? 's' : ''} old`;
  }
  
  const months = Math.floor(days / 30.44);
  if (months < 24) {
    return `${months} month${months !== 1 ? 's' : ''} old`;
  }
  
  const years = Math.floor(days / 365.25);
  return `${years} year${years !== 1 ? 's' : ''} old`;
}
