import { useState } from 'react';
import { Bell, X, Users, Share2, Check, CheckCheck, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useConnections } from '@/hooks/useConnections';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onAddToCircle,
  isConnected,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAddToCircle: (userId: string) => Promise<void>;
  isConnected: (userId: string) => boolean;
}) {
  const isInvite = notification.type === 'invite_joined';
  const isWelcome = notification.type === 'welcome_via_invite';
  const isMomentShared = notification.type === 'moment_shared';
  const Icon = isWelcome ? Sparkles : isInvite ? Users : Share2;
  const joinedUserId = notification.data?.joined_user_id as string | undefined;
  const alreadyConnected = joinedUserId ? isConnected(joinedUserId) : true;

  return (
    <div
      className={cn(
        'p-3 border-b border-border last:border-0 transition-colors',
        !notification.read && 'bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-full shrink-0',
            isWelcome ? 'bg-purple-500/10 text-purple-500' :
            isInvite ? 'bg-green-500/10 text-green-500' : 
            'bg-blue-500/10 text-blue-500'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{notification.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[10px] text-muted-foreground/60">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
            {isInvite && joinedUserId && !alreadyConnected && (
              <Button
                variant="outline"
                size="sm"
                className="h-5 text-[10px] px-2 gap-1"
                onClick={() => onAddToCircle(joinedUserId)}
              >
                <UserPlus className="h-3 w-3" />
                Add to Circle
              </Button>
            )}
            {isInvite && alreadyConnected && joinedUserId && (
              <span className="text-[10px] text-green-600">Already in Circle</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onMarkAsRead(notification.id)}
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(notification.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationBubble() {
  const { user, isAuthenticated } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications(user?.id || null);
  const { connections, addConnection } = useConnections(user?.id || null);
  const [open, setOpen] = useState(false);
  const [addedUsers, setAddedUsers] = useState<Set<string>>(new Set());

  const isConnected = (userId: string) => {
    return connections.some(c => c.connectedUserId === userId) || addedUsers.has(userId);
  };

  const handleAddToCircle = async (userId: string) => {
    try {
      await addConnection(userId);
      setAddedUsers(prev => new Set(prev).add(userId));
      toast.success('Added to your Circle!');
    } catch (error) {
      toast.error('Failed to add to Circle');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
                onAddToCircle={handleAddToCircle}
                isConnected={isConnected}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
