import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AuthButton() {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="rounded-full h-10 px-4 gap-2 shadow-lg"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline max-w-[100px] truncate">
              {user.email?.split('@')[0]}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => navigate('/auth')}
      className="rounded-full h-10 px-4 gap-2 shadow-lg"
    >
      <User className="h-4 w-4" />
      <span className="hidden sm:inline">Sign In</span>
    </Button>
  );
}
