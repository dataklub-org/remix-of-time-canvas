import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  memberCount?: number;
  color?: string; // User-specific color for this group
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
  status: 'pending' | 'accepted';
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface PendingInvitation {
  id: string;
  groupId: string;
  groupName: string;
  invitedAt: string;
  invitedBy: string; // user_id of the group creator who invited
  inviterUsername?: string;
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
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch groups with member count
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

      // Fetch user's color preferences for their group memberships
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id, color')
        .eq('user_id', userId);

      const colorMap = new Map(memberships?.map(m => [m.group_id, m.color]) || []);

      const formattedGroups: Group[] = (data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        createdBy: g.created_by,
        createdAt: g.created_at,
        memberCount: g.group_members?.[0]?.count || 0,
        color: colorMap.get(g.id) || undefined,
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
    fetchPendingInvitations();
  }, [fetchGroups]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          joined_at,
          groups!inner(name, created_by)
        `)
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      // Fetch inviter usernames
      const inviterIds = [...new Set((data || []).map((row: any) => row.groups?.created_by).filter(Boolean))];
      let inviterMap = new Map<string, string>();
      
      if (inviterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('public_usernames')
          .select('user_id, username')
          .in('user_id', inviterIds);
        
        inviterMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
      }

      const invitations: PendingInvitation[] = (data || []).map((row: any) => ({
        id: row.id,
        groupId: row.group_id,
        groupName: row.groups?.name || 'Unknown Group',
        invitedAt: row.joined_at,
        invitedBy: row.groups?.created_by || '',
        inviterUsername: inviterMap.get(row.groups?.created_by) || undefined,
      }));

      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  }, [userId]);

  const acceptInvitation = async (membershipId: string, groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'accepted' })
        .eq('id', membershipId);

      if (error) throw error;

      setPendingInvitations(prev => prev.filter(inv => inv.id !== membershipId));
      await fetchGroups(); // Refresh groups list
      console.log('Invitation accepted!');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      console.log('Failed to accept invitation');
    }
  };

  const declineInvitation = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      setPendingInvitations(prev => prev.filter(inv => inv.id !== membershipId));
      console.log('Invitation declined');
    } catch (error) {
      console.error('Error declining invitation:', error);
      console.log('Failed to decline invitation');
    }
  };

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
          status: 'pending', // Invited members need to accept
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
      console.log(`Group "${name}" created!`);
      return newGroup;
    } catch (error: any) {
      console.error('Error creating group:', error);
      console.log('Failed to create group');
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
      console.log('Group deleted');
    } catch (error) {
      console.error('Error deleting group:', error);
      console.log('Failed to delete group');
    }
  };

  const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, joined_at, status')
        .eq('group_id', groupId)
        .eq('status', 'accepted'); // Only show accepted members

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
          status: m.status as 'pending' | 'accepted',
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
      // Direct invites create a pending membership that the user must accept
      const { error } = await supabase
        .from('group_members')
        .insert({ 
          group_id: groupId, 
          user_id: memberUserId,
          status: 'pending'
        });

      if (error) throw error;

      console.log('Invitation sent');
    } catch (error: any) {
      if (error.code === '23505') {
        console.log('User is already a member or has a pending invite');
      } else {
        console.error('Error adding member:', error);
        console.log('Failed to send invitation');
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

      console.log('Member removed from group');
    } catch (error) {
      console.error('Error removing member:', error);
      console.log('Failed to remove member');
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

  const updateGroupColor = async (groupId: string, color: string | null) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ color })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, color: color || undefined } : g
      ));
    } catch (error) {
      console.error('Error updating group color:', error);
      console.log('Failed to update group color');
    }
  };

  return {
    groups,
    pendingInvitations,
    loading,
    fetchGroups,
    createGroup,
    deleteGroup,
    getGroupMembers,
    addMemberToGroup,
    removeMemberFromGroup,
    getGroupMoments,
    acceptInvitation,
    declineInvitation,
    updateGroupColor,
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

      console.log('Moment shared to group!');
      return true;
    } catch (error) {
      console.error('Error sharing moment:', error);
      console.log('Failed to share moment');
      return false;
    }
  };

  return { shareMomentToGroup };
}
