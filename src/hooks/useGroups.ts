import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  memberCount?: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface GroupMoment {
  id: string;
  groupId: string;
  originalMomentId: string | null;
  sharedBy: string;
  sharedAt: string;
  startTime: number;
  endTime: number | null;
  yPosition: number;
  width: number | null;
  height: number | null;
  description: string;
  people: string | null;
  location: string | null;
  category: 'business' | 'personal';
  memorable: boolean;
  photoUrl: string | null;
}

export function useGroups(userId: string | null) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          created_by,
          created_at,
          group_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedGroups: Group[] = (data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        createdBy: g.created_by,
        createdAt: g.created_at,
        memberCount: g.group_members?.[0]?.count || 0,
      }));

      setGroups(formattedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (name: string, memberUserIds: string[]): Promise<Group | null> => {
    if (!userId) return null;

    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({ name, created_by: userId })
        .select()
        .maybeSingle();

      if (groupError) throw groupError;
      if (!groupData) throw new Error('Group was created but could not be returned');

      // NOTE: Creator is automatically added as a member by DB trigger.
      // Only insert the *additional* selected members here.
      const additionalMembers = memberUserIds.filter(id => id && id !== userId);
      if (additionalMembers.length > 0) {
        const memberInserts = additionalMembers.map(uid => ({
          group_id: groupData.id,
          user_id: uid,
        }));

        const { error: memberError } = await supabase
          .from('group_members')
          .insert(memberInserts);

        // If a member is already inserted (race/dup), treat as non-fatal.
        if (memberError && memberError.code !== '23505') throw memberError;
      }

      const newGroup: Group = {
        id: groupData.id,
        name: groupData.name,
        createdBy: groupData.created_by,
        createdAt: groupData.created_at,
        memberCount: 1 + additionalMembers.length,
      };

      setGroups(prev => [newGroup, ...prev]);
      toast.success(`Group "${name}" created!`);
      return newGroup;
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
      return null;
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      setGroups(prev => prev.filter(g => g.id !== groupId));
      toast.success('Group deleted');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, joined_at')
        .eq('group_id', groupId);

      if (error) throw error;

      // Fetch profile info for each member
      const userIds = (data || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map(m => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          groupId: m.group_id,
          userId: m.user_id,
          joinedAt: m.joined_at,
          username: profile?.username,
          displayName: profile?.display_name,
          avatarUrl: profile?.avatar_url,
        };
      });
    } catch (error) {
      console.error('Error fetching group members:', error);
      return [];
    }
  };

  const addMemberToGroup = async (groupId: string, memberUserId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: memberUserId });

      if (error) throw error;

      // Update member count locally
      setGroups(prev => prev.map(g => 
        g.id === groupId 
          ? { ...g, memberCount: (g.memberCount || 0) + 1 }
          : g
      ));

      toast.success('Member added to group');
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('User is already a member');
      } else {
        console.error('Error adding member:', error);
        toast.error('Failed to add member');
      }
    }
  };

  const removeMemberFromGroup = async (groupId: string, memberUserId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberUserId);

      if (error) throw error;

      setGroups(prev => prev.map(g => 
        g.id === groupId 
          ? { ...g, memberCount: Math.max((g.memberCount || 1) - 1, 0) }
          : g
      ));

      toast.success('Member removed from group');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const getGroupMoments = async (groupId: string): Promise<GroupMoment[]> => {
    try {
      const { data, error } = await supabase
        .from('group_moments')
        .select('*')
        .eq('group_id', groupId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        groupId: m.group_id,
        originalMomentId: m.original_moment_id,
        sharedBy: m.shared_by,
        sharedAt: m.shared_at,
        startTime: m.start_time,
        endTime: m.end_time,
        yPosition: m.y_position,
        width: m.width,
        height: m.height,
        description: m.description,
        people: m.people,
        location: m.location,
        category: m.category,
        memorable: m.memorable || false,
        photoUrl: m.photo_url,
      }));
    } catch (error) {
      console.error('Error fetching group moments:', error);
      return [];
    }
  };

  return {
    groups,
    loading,
    fetchGroups,
    createGroup,
    deleteGroup,
    getGroupMembers,
    addMemberToGroup,
    removeMemberFromGroup,
    getGroupMoments,
  };
}

export function useShareMoment(userId: string | null) {
  const shareMomentToGroup = async (
    groupId: string,
    moment: {
      id: string;
      timestamp: number;
      endTime?: number;
      y: number;
      width?: number;
      height?: number;
      description: string;
      people: string;
      location: string;
      category: 'business' | 'personal';
      memorable?: boolean;
      photo?: string;
    }
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('group_moments')
        .insert({
          group_id: groupId,
          original_moment_id: moment.id,
          shared_by: userId,
          start_time: moment.timestamp,
          end_time: moment.endTime || null,
          y_position: moment.y,
          width: moment.width || null,
          height: moment.height || null,
          description: moment.description,
          people: moment.people || null,
          location: moment.location || null,
          category: moment.category,
          memorable: moment.memorable || false,
          photo_url: moment.photo || null,
        });

      if (error) throw error;

      toast.success('Moment shared to group!');
      return true;
    } catch (error) {
      console.error('Error sharing moment:', error);
      toast.error('Failed to share moment');
      return false;
    }
  };

  return { shareMomentToGroup };
}
