import { useState } from 'react';
import { Plus, Users2, Trash2, ChevronRight, Loader2, Check, X, Mail, UserPlus, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Group, GroupMember, PendingInvitation } from '@/hooks/useGroups';
import { Connection } from '@/hooks/useConnections';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { COLOR_PALETTE, DEFAULT_GROUP_COLOR } from '@/utils/colorPalette';
import { GroupInviteLink } from '@/components/canvas/GroupInviteLink';
import { DirectGroupInvite } from './DirectGroupInvite';

interface GroupsSectionProps {
  groups: Group[];
  pendingInvitations: PendingInvitation[];
  loading: boolean;
  connections: Connection[];
  userId: string;
  onCreateGroup: (name: string, memberIds: string[]) => Promise<Group | null>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onGetMembers: (groupId: string) => Promise<GroupMember[]>;
  onAcceptInvitation: (membershipId: string, groupId: string) => Promise<void>;
  onDeclineInvitation: (membershipId: string) => Promise<void>;
  onAddConnection?: (userId: string) => Promise<unknown>;
  onUpdateGroupColor?: (groupId: string, color: string | null) => Promise<void>;
  onAddMemberToGroup?: (groupId: string, userId: string) => Promise<void>;
}

export function GroupsSection({
  groups,
  pendingInvitations,
  loading,
  connections,
  userId,
  onCreateGroup,
  onDeleteGroup,
  onGetMembers,
  onAcceptInvitation,
  onDeclineInvitation,
  onAddConnection,
  onUpdateGroupColor,
  onAddMemberToGroup,
}: GroupsSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    setCreating(true);
    const group = await onCreateGroup(newGroupName.trim(), selectedMembers);
    if (group) {
      setNewGroupName('');
      setSelectedMembers([]);
      setIsCreating(false);
    }
    setCreating(false);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleExpandGroup = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    
    setExpandedGroupId(groupId);
    setLoadingMembers(true);
    const members = await onGetMembers(groupId);
    setGroupMembers(members);
    setLoadingMembers(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Users2 className="h-4 w-4" />
          Groups ({groups.length})
        </h4>
        {!isCreating && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreating(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Group
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <Input
            placeholder="Group name..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="h-9"
            autoFocus
          />
          
          {connections.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Add members from your circle:</p>
              <div className="flex flex-wrap gap-2">
                {connections.map((conn) => (
                  <button
                    key={conn.id}
                    onClick={() => toggleMember(conn.connectedUserId)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors",
                      selectedMembers.includes(conn.connectedUserId)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={conn.avatarUrl || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {conn.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    @{conn.username}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || creating}
              className="flex-1"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Group'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setNewGroupName('');
                setSelectedMembers([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Pending Invitations ({pendingInvitations.length})
          </h5>
          <div className="space-y-1">
            {pendingInvitations.map((invitation) => {
              // Check if the inviter is already in connections
              const isAlreadyConnected = connections.some(
                conn => conn.connectedUserId === invitation.invitedBy
              );
              
              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-2 border rounded-lg bg-primary/5"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{invitation.groupName}</span>
                    {invitation.inviterUsername && (
                      <span className="text-xs text-muted-foreground">
                        Invited by @{invitation.inviterUsername}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {/* Add to Circle button - only show if inviter is not already connected */}
                    {onAddConnection && invitation.invitedBy && !isAlreadyConnected && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onAddConnection(invitation.invitedBy)}
                        className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                        title={`Add @${invitation.inviterUsername || 'user'} to your circle`}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAcceptInvitation(invitation.id, invitation.groupId)}
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeclineInvitation(invitation.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 && pendingInvitations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No groups yet. Create one to start sharing moments!
        </p>
      ) : groups.length === 0 ? null : (
        <div className="space-y-1">
          {groups.map((group) => (
            <div key={group.id} className="border rounded-lg overflow-hidden">
              <div
                onClick={() => handleExpandGroup(group.id)}
                className="flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {/* Color indicator */}
                  <div 
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: group.color || DEFAULT_GROUP_COLOR }}
                  />
                  <ChevronRight 
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      expandedGroupId === group.id && "rotate-90"
                    )} 
                  />
                  <span className="font-medium text-sm">{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Color picker */}
                  {onUpdateGroupColor && (
                    <Popover 
                      open={colorPickerOpen === group.id} 
                      onOpenChange={(open) => setColorPickerOpen(open ? group.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorPickerOpen(colorPickerOpen === group.id ? null : group.id);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Palette className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-2 z-50 bg-popover" 
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="grid grid-cols-5 gap-1.5">
                          {COLOR_PALETTE.map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                onUpdateGroupColor(group.id, color);
                                setColorPickerOpen(null);
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all",
                                group.color === color 
                                  ? "border-foreground scale-110" 
                                  : "border-transparent hover:scale-110"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        {group.color && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onUpdateGroupColor(group.id, null);
                              setColorPickerOpen(null);
                            }}
                            className="w-full mt-2 text-xs h-7"
                          >
                            Remove color
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                  )}
                  {group.createdBy === userId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteGroup(group.id);
                      }}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              
              {expandedGroupId === group.id && (
                <div className="border-t bg-muted/20 p-2">
                  {loadingMembers ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 p-1.5 rounded-md"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.username?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            @{member.username || 'unknown'}
                            {member.userId === userId && (
                              <span className="text-muted-foreground ml-1">(you)</span>
                            )}
                          </span>
                        </div>
                      ))}
                      
                      {/* Group invite section */}
                      <div className="pt-2 border-t mt-2 space-y-2">
                        <p className="text-xs text-muted-foreground">Invite others to join:</p>
                        
                        {/* Direct invite from circle */}
                        {onAddMemberToGroup && (
                          <DirectGroupInvite
                            groupId={group.id}
                            connections={connections}
                            groupMembers={groupMembers}
                            onInvite={onAddMemberToGroup}
                          />
                        )}
                        
                        {/* Invite link */}
                        <GroupInviteLink groupId={group.id} userId={userId} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
