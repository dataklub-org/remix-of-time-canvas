import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { redeemInviteCode } from './useInviteCode';
import { redeemGroupInviteCode } from './useGroupInviteCode';
import { devLog } from '../utils/logger';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

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
        devLog('🔐 Auth event:', event);
        devLog('👤 User:', session?.user?.email || 'No user');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch profile and handle invite codes when user logs in
        if (session?.user) {
          devLog('✅ User logged in:', session.user.email);
          setTimeout(() => {
            fetchProfile(session.user.id);
            // Redeem any pending invite codes on SIGNED_IN event
            if (event === 'SIGNED_IN') {
              redeemInviteCode(session.user.id);
              redeemGroupInviteCode(session.user.id);
            }
          }, 0);
        } else {
          devLog('❌ User logged out');
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
    // First check if username is available
    const isAvailable = await checkUsernameAvailable(username);
    if (!isAvailable) {
      return { error: { message: 'Username is already taken' } };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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
    devLog('[GoogleAuth] start');
    const useProxy = Constants.appOwnership === 'expo';
    const redirectTo = AuthSession.makeRedirectUri({
      scheme: 'mylife',
      path: 'auth/callback',
      useProxy,
    });
    devLog('[GoogleAuth] redirectTo', redirectTo, { useProxy });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      devLog('[GoogleAuth] signInWithOAuth error', error);
      return { error: error ?? { message: 'Failed to start Google sign-in' } };
    }

    devLog('[GoogleAuth] authUrl', data.url);
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    devLog('[GoogleAuth] authSession result', result);
    if (result.type !== 'success' || !result.url) {
      return { error: { message: 'Google sign-in was cancelled' } };
    }

    const parsed = AuthSession.parseUrl(result.url);
    devLog('[GoogleAuth] parsed callback', parsed);
    const code = parsed.params?.code as string | undefined;
    if (!code) {
      return { error: { message: 'Missing auth code from Google sign-in' } };
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    devLog('[GoogleAuth] exchange result', exchangeError ? 'error' : 'success');
    return { error: exchangeError };
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
