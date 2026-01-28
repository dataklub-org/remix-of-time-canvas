import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { redeemInviteCode } from '@/hooks/useInviteCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Check, X } from 'lucide-react';
import fractalito from '@/assets/fractalito-logo.png';

const usernameSchema = z.string()
  .min(3, { message: "Username must be at least 3 characters" })
  .max(20, { message: "Username must be less than 20 characters" })
  .regex(/^[a-zA-Z0-9_]+$/, { message: "Only letters, numbers, and underscores allowed" });

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Check if user is authenticated and needs to complete profile
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      // Check if profile already exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profile) {
        // Profile exists, redirect to home
        navigate('/');
        return;
      }

      setUserId(session.user.id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const checkUsernameAvailable = useCallback(async (usernameToCheck: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', usernameToCheck)
      .maybeSingle();
    
    return !data && !error;
  }, []);

  // Debounced username check
  useEffect(() => {
    if (!username) {
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    const validation = usernameSchema.safeParse(username);
    if (!validation.success) {
      setUsernameError(validation.error.errors[0].message);
      setUsernameAvailable(null);
      return;
    }

    setUsernameError(null);
    setCheckingUsername(true);
    
    const timeout = setTimeout(async () => {
      const available = await checkUsernameAvailable(username);
      setUsernameAvailable(available);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [username, checkUsernameAvailable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = usernameSchema.safeParse(username);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (!usernameAvailable) {
      setError('Please choose an available username');
      return;
    }

    if (!userId) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setSubmitting(true);

    try {
      // Create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username: username.toLowerCase(),
        });

      if (profileError) {
        if (profileError.code === '23505') {
          setError('Username is already taken. Please choose another.');
        } else {
          throw profileError;
        }
        return;
      }

      // Try to redeem any pending invite code
      await redeemInviteCode(userId);

      // Navigate to home
      navigate('/');
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError('Failed to create profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-4">
        <img src={fractalito} alt="Fractalito" className="h-8 w-auto" />
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Choose your username
            </h1>
            <p className="text-muted-foreground text-sm">
              Pick a unique username to complete your profile
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="pl-10 pr-10"
                  required
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
              {usernameError && (
                <p className="text-xs text-destructive">{usernameError}</p>
              )}
              {!checkingUsername && usernameAvailable === false && !usernameError && (
                <p className="text-xs text-destructive">Username is taken</p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={submitting || !usernameAvailable}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Continue'
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Your username will be visible to other users when sharing moments
          </p>
        </div>
      </main>
    </div>
  );
}
