import { useState } from 'react';
import { X, Search, UserPlus, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { useConnections, Connection } from '@/hooks/useConnections';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { GroupsSection } from './GroupsSection';
import { Separator } from '@/components/ui/separator';

export function MyCircle() {
  const { user, isAuthenticated } = useAuth();
  const {
    connections,
    loading,
    searchResults,
    searching,
    searchUsers,
    addConnection,
    removeConnection,
    clearSearchResults,
  } = useConnections(user?.id || null);

  const {
    groups,
    pendingInvitations,
    loading: groupsLoading,
    createGroup,
    deleteGroup,
    getGroupMembers,
    acceptInvitation,
    declineInvitation,
    updateGroupColor,
  } = useGroups(user?.id || null);

  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchUsers(value);
  };

  const handleAddConnection = async (userId: string) => {
    await addConnection(userId);
    setSearchQuery('');
  };

  const handleRemoveConnection = async (connectionId: string) => {
    await removeConnection(connectionId);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">My Circle</span>
          {connections.length > 0 && (
            <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {connections.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Circle
          </DialogTitle>
          <DialogDescription>
            Manage your connections and groups
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search for users */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.userId}
                    className="flex items-center justify-between p-2 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={result.avatarUrl || undefined} />
                        <AvatarFallback>
                          {result.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">@{result.username}</p>
                        {result.displayName && (
                          <p className="text-xs text-muted-foreground">
                            {result.displayName}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddConnection(result.userId)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No users found
              </p>
            )}
          </div>

          {/* Current connections */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              In your circle ({connections.length})
            </h4>
            
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : connections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No connections yet. Search for users to add them to your circle.
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {connections.map((connection) => (
                  <ConnectionItem
                    key={connection.id}
                    connection={connection}
                    onRemove={handleRemoveConnection}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Groups section */}
          <GroupsSection
            groups={groups}
            pendingInvitations={pendingInvitations}
            loading={groupsLoading}
            connections={connections}
            userId={user?.id || ''}
            onCreateGroup={createGroup}
            onDeleteGroup={deleteGroup}
            onGetMembers={getGroupMembers}
            onAcceptInvitation={acceptInvitation}
            onDeclineInvitation={declineInvitation}
            onAddConnection={addConnection}
            onUpdateGroupColor={updateGroupColor}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConnectionItem({
  connection,
  onRemove,
}: {
  connection: Connection;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={connection.avatarUrl || undefined} />
          <AvatarFallback>
            {connection.username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">@{connection.username}</p>
          {connection.displayName && (
            <p className="text-xs text-muted-foreground">
              {connection.displayName}
            </p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onRemove(connection.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
