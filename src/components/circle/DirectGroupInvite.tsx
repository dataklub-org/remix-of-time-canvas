import { useState, useMemo } from 'react';
import { UserPlus, Loader2, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Connection } from '@/hooks/useConnections';
import { GroupMember } from '@/hooks/useGroups';
import { cn } from '@/lib/utils';

interface DirectGroupInviteProps {
  groupId: string;
  connections: Connection[];
  groupMembers: GroupMember[];
  onInvite: (groupId: string, userId: string) => Promise<void>;
}

export function DirectGroupInvite({
  groupId,
  connections,
  groupMembers,
  onInvite,
}: DirectGroupInviteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviting, setInviting] = useState<string | null>(null);

  // Filter out connections who are already group members
  const availableConnections = useMemo(() => {
    const memberUserIds = new Set(groupMembers.map(m => m.userId));
    return connections.filter(conn => !memberUserIds.has(conn.connectedUserId));
  }, [connections, groupMembers]);

  // Further filter by search query
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return availableConnections;
    const query = searchQuery.toLowerCase();
    return availableConnections.filter(
      conn =>
        conn.username.toLowerCase().includes(query) ||
        conn.displayName?.toLowerCase().includes(query)
    );
  }, [availableConnections, searchQuery]);

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    try {
      await onInvite(groupId, userId);
      // After successful invite, user will be added to groupMembers
      // so they'll be filtered out from availableConnections
    } finally {
      setInviting(null);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full text-xs h-8"
        disabled={availableConnections.length === 0}
      >
        <UserPlus className="h-3 w-3 mr-1.5" />
        {availableConnections.length === 0
          ? 'All connections are members'
          : `Invite from Circle (${availableConnections.length})`}
      </Button>
    );
  }

  return (
    <div className="space-y-2 p-2 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Invite from Circle
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery('');
          }}
          className="h-6 w-6 p-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {availableConnections.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      )}

      <div className="max-h-32 overflow-y-auto space-y-1">
        {filteredConnections.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            {searchQuery ? 'No matching connections' : 'No connections to invite'}
          </p>
        ) : (
          filteredConnections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={conn.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {conn.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">@{conn.username}</p>
                  {conn.displayName && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {conn.displayName}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleInvite(conn.connectedUserId)}
                disabled={inviting === conn.connectedUserId}
                className={cn(
                  "h-6 w-6 p-0 shrink-0",
                  "text-primary hover:text-primary hover:bg-primary/10"
                )}
              >
                {inviting === conn.connectedUserId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
