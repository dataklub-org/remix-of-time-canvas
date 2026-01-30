import { useState, useEffect } from 'react';
import { Crown, Heart, Trash2, Loader2, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { BabyAccess } from '@/types/baby';
import { cn } from '@/lib/utils';

interface BabyAccessManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  babyName: string;
  babyId: string;
  currentUserId: string;
  getBabyAccess: (babyId: string) => Promise<BabyAccess[]>;
  revokeAccess: (accessId: string) => Promise<boolean>;
}

export function BabyAccessManager({
  open,
  onOpenChange,
  babyName,
  babyId,
  currentUserId,
  getBabyAccess,
  revokeAccess,
}: BabyAccessManagerProps) {
  const [accessList, setAccessList] = useState<BabyAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<BabyAccess | null>(null);

  useEffect(() => {
    if (open) {
      loadAccessList();
    }
  }, [open, babyId]);

  const loadAccessList = async () => {
    setLoading(true);
    const list = await getBabyAccess(babyId);
    setAccessList(list);
    setLoading(false);
  };

  const handleRevokeAccess = async (access: BabyAccess) => {
    setRevoking(access.id);
    const success = await revokeAccess(access.id);
    if (success) {
      setAccessList((prev) => prev.filter((a) => a.id !== access.id));
    }
    setRevoking(null);
    setConfirmRevoke(null);
  };

  const parents = accessList.filter((a) => a.role === 'parent' && a.status === 'accepted');
  const angels = accessList.filter((a) => a.role === 'angel' && a.status === 'accepted');
  const pending = accessList.filter((a) => a.status === 'pending');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {babyName}'s Circle
            </DialogTitle>
            <DialogDescription>
              People with access to this baby's timeline
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Parents Section */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Parents ({parents.length})
                </h4>
                {parents.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">No parents</p>
                ) : (
                  <div className="space-y-1">
                    {parents.map((access) => (
                      <AccessItem
                        key={access.id}
                        access={access}
                        currentUserId={currentUserId}
                        canRemove={false} // Parents cannot be removed by other parents
                        onRemove={() => {}}
                        removing={revoking === access.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Angels Section */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Angels ({angels.length})
                </h4>
                {angels.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">No angels yet</p>
                ) : (
                  <div className="space-y-1">
                    {angels.map((access) => (
                      <AccessItem
                        key={access.id}
                        access={access}
                        currentUserId={currentUserId}
                        canRemove={true}
                        onRemove={() => setConfirmRevoke(access)}
                        removing={revoking === access.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Invitations */}
              {pending.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Pending Invitations ({pending.length})
                  </h4>
                  <div className="space-y-1">
                    {pending.map((access) => (
                      <AccessItem
                        key={access.id}
                        access={access}
                        currentUserId={currentUserId}
                        canRemove={true}
                        onRemove={() => setConfirmRevoke(access)}
                        removing={revoking === access.id}
                        isPending
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm revoke dialog */}
      <AlertDialog open={!!confirmRevoke} onOpenChange={() => setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove access?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRevoke?.username ? (
                <>
                  @{confirmRevoke.username} will no longer be able to see {babyName}'s timeline.
                </>
              ) : (
                <>This person will no longer have access to {babyName}'s timeline.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRevoke && handleRevokeAccess(confirmRevoke)}
            >
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AccessItem({
  access,
  currentUserId,
  canRemove,
  onRemove,
  removing,
  isPending = false,
}: {
  access: BabyAccess;
  currentUserId: string;
  canRemove: boolean;
  onRemove: () => void;
  removing: boolean;
  isPending?: boolean;
}) {
  const isMe = access.userId === currentUserId;
  const RoleIcon = access.role === 'parent' ? Crown : Heart;

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-lg',
        isPending ? 'bg-muted/50' : 'bg-muted/30'
      )}
    >
      <div className="flex items-center gap-2">
        <RoleIcon
          className={cn(
            'h-4 w-4',
            access.role === 'parent' ? 'text-amber-500' : 'text-pink-500'
          )}
        />
        <div>
          <p className="text-sm font-medium">
            {access.displayName || access.username || 'Unknown'}
            {isMe && <span className="text-muted-foreground ml-1">(you)</span>}
          </p>
          {access.username && access.displayName && (
            <p className="text-xs text-muted-foreground">@{access.username}</p>
          )}
          {access.role === 'angel' && access.permission && (
            <p className="text-xs text-muted-foreground capitalize">
              {access.permission === 'contribute' ? 'Can add moments' : 'View only'}
            </p>
          )}
          {isPending && (
            <p className="text-xs text-amber-600">Pending acceptance</p>
          )}
        </div>
      </div>
      {canRemove && !isMe && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={removing}
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}

// Double-confirm dialog for adding parents
interface ConfirmParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  babyName: string;
  onConfirm: () => void;
  confirming: boolean;
}

export function ConfirmParentDialog({
  open,
  onOpenChange,
  username,
  babyName,
  onConfirm,
  confirming,
}: ConfirmParentDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep(1);
    }
    onOpenChange(newOpen);
  };

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleFinalConfirm = () => {
    onConfirm();
    setStep(1);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {step === 1 ? 'Add Parent?' : 'Final Confirmation'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {step === 1 ? (
                <>
                  <p>
                    You are about to give <strong>@{username}</strong> full parent access to{' '}
                    <strong>{babyName}</strong>'s timeline.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                      Parents have equal rights:
                    </p>
                    <ul className="list-disc list-inside text-amber-700 dark:text-amber-300 space-y-1">
                      <li>Add, edit, and delete any moments</li>
                      <li>Invite and remove angels</li>
                      <li>Change baby settings and color</li>
                      <li>Cannot be removed by other parents</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-base font-medium">
                    Are you absolutely sure?
                  </p>
                  <p>
                    This action <strong>cannot be undone</strong>. @{username} will have permanent
                    parent access to {babyName}'s timeline.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
          {step === 1 ? (
            <Button onClick={handleFirstConfirm} variant="default">
              Yes, Continue
            </Button>
          ) : (
            <AlertDialogAction
              onClick={handleFinalConfirm}
              disabled={confirming}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {confirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Add Parent
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
