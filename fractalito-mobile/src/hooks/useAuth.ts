import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { redeemInviteCode } from './useInviteCode';
import { redeemGroupInviteCode } from './useGroupInviteCode';

interface UserProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data) {
      setProfile({
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
      });
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch profile and handle invite codes when user logs in
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            // Redeem any pending invite codes on SIGNED_IN event
            if (event === 'SIGNED_IN') {
              redeemInviteCode(session.user.id);
              redeemGroupInviteCode(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const checkUsernameAvailable = useCallback(async (username: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    
    return !data && !error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // First check if username is available
    const isAvailable = await checkUsernameAvailable(username);
    if (!isAvailable) {
      return { error: { message: 'Username is already taken' } };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) return { error };
    
    // Create profile with username
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          username: username.toLowerCase(),
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
        return { error: { message: 'Failed to create profile' } };
      }
    }
    
    return { error: null };
  }, [checkUsernameAvailable]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirect to complete-profile page to check if username is needed
        redirectTo: `${window.location.origin}/complete-profile`,
      },
    });
    return { error };
  }, []);

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    checkUsernameAvailable,
    isAuthenticated: !!user,
  };
}
