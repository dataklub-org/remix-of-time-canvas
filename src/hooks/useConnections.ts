import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Connection {
  id: string;
  connectedUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface UserSearchResult {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function useConnections(userId: string | null) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Load user's connections
  const loadConnections = useCallback(async () => {
    if (!userId) {
      setConnections([]);
      return;
    }

    setLoading(true);
    try {
      // Get connections with profile data
      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          connected_user_id,
          created_at
        `)
        .eq('user_id', userId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch profiles for connected users
        const connectedUserIds = data.map(c => c.connected_user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', connectedUserIds);

        if (profilesError) throw profilesError;

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const connectionsWithProfiles: Connection[] = data
          .map(c => {
            const profile = profileMap.get(c.connected_user_id);
            if (!profile) return null;
            return {
              id: c.id,
              connectedUserId: c.connected_user_id,
              username: profile.username,
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
              createdAt: c.created_at,
            };
          })
          .filter((c): c is Connection => c !== null);

        setConnections(connectionsWithProfiles);
      } else {
        setConnections([]);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Search for users by username
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out current user and already connected users
      const connectedIds = new Set(connections.map(c => c.connectedUserId));
      connectedIds.add(userId || '');

      const results: UserSearchResult[] = (data || [])
        .filter(p => !connectedIds.has(p.user_id))
        .map(p => ({
          userId: p.user_id,
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
        }));

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [userId, connections]);

  // Add a connection
  const addConnection = useCallback(async (connectedUserId: string) => {
    if (!userId) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id: userId,
          connected_user_id: connectedUserId,
        });

      if (error) throw error;

      // Reload connections
      await loadConnections();
      setSearchResults([]);
      return { error: null };
    } catch (error: any) {
      console.error('Error adding connection:', error);
      return { error: error.message || 'Failed to add connection' };
    }
  }, [userId, loadConnections]);

  // Remove a connection
  const removeConnection = useCallback(async (connectionId: string) => {
    if (!userId) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', userId);

      if (error) throw error;

      setConnections(prev => prev.filter(c => c.id !== connectionId));
      return { error: null };
    } catch (error: any) {
      console.error('Error removing connection:', error);
      return { error: error.message || 'Failed to remove connection' };
    }
  }, [userId]);

  // Load connections on mount/userId change
  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  return {
    connections,
    loading,
    searchResults,
    searching,
    searchUsers,
    addConnection,
    removeConnection,
    clearSearchResults: () => setSearchResults([]),
  };
}
