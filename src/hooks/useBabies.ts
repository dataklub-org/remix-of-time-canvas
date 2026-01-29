import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Baby, BabyAccess, BabyMoment, BabyAccessRole, AngelPermission, AccessStatus } from '@/types/baby';

export interface PendingBabyInvitation {
  id: string;
  babyId: string;
  babyName: string;
  role: BabyAccessRole;
  permission?: AngelPermission;
  invitedAt: Date;
  inviterUsername?: string;
}

export function useBabies(userId: string | null) {
  const [babies, setBabies] = useState<Baby[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingBabyInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBabies = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('babies')
        .select('*')
        .order('date_of_birth', { ascending: false });

      if (error) throw error;

      const formattedBabies: Baby[] = (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        username: b.username,
        dateOfBirth: new Date(b.date_of_birth),
        timeOfBirth: b.time_of_birth || undefined,
        placeOfBirth: b.place_of_birth || undefined,
        createdBy: b.created_by,
        createdAt: new Date(b.created_at),
        updatedAt: new Date(b.updated_at),
      }));

      setBabies(formattedBabies);
    } catch (error) {
      console.error('Error fetching babies:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('baby_access')
        .select(`
          id,
          baby_id,
          role,
          permission,
          created_at,
          invited_by,
          babies!inner(name)
        `)
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      // Fetch inviter usernames
      const inviterIds = [...new Set((data || []).map((row: any) => row.invited_by).filter(Boolean))];
      let inviterMap = new Map<string, string>();
      
      if (inviterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('public_usernames')
          .select('user_id, username')
          .in('user_id', inviterIds);
        
        inviterMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
      }

      const invitations: PendingBabyInvitation[] = (data || []).map((row: any) => ({
        id: row.id,
        babyId: row.baby_id,
        babyName: row.babies?.name || 'Unknown',
        role: row.role as BabyAccessRole,
        permission: row.permission as AngelPermission | undefined,
        invitedAt: new Date(row.created_at),
        inviterUsername: inviterMap.get(row.invited_by),
      }));

      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error fetching pending baby invitations:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchBabies();
    fetchPendingInvitations();
  }, [fetchBabies, fetchPendingInvitations]);

  const createBaby = async (data: {
    name: string;
    username: string;
    dateOfBirth: Date;
    timeOfBirth?: string;
    placeOfBirth?: string;
  }): Promise<Baby | null> => {
    if (!userId) return null;

    try {
      const { data: babyData, error } = await supabase
        .from('babies')
        .insert({
          created_by: userId,
          name: data.name,
          username: data.username,
          date_of_birth: data.dateOfBirth.toISOString().split('T')[0],
          time_of_birth: data.timeOfBirth || null,
          place_of_birth: data.placeOfBirth || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newBaby: Baby = {
        id: babyData.id,
        name: babyData.name,
        username: babyData.username,
        dateOfBirth: new Date(babyData.date_of_birth),
        timeOfBirth: babyData.time_of_birth || undefined,
        placeOfBirth: babyData.place_of_birth || undefined,
        createdBy: babyData.created_by,
        createdAt: new Date(babyData.created_at),
        updatedAt: new Date(babyData.updated_at),
      };

      setBabies(prev => [newBaby, ...prev]);
      toast.success(`${data.name}'s timeline created!`);
      return newBaby;
    } catch (error: any) {
      console.error('Error creating baby:', error);
      if (error.code === '23505') {
        toast.error('This username is already taken');
      } else {
        toast.error('Failed to create baby timeline');
      }
      return null;
    }
  };

  const updateBaby = async (babyId: string, updates: Partial<{
    name: string;
    dateOfBirth: Date;
    timeOfBirth: string | null;
    placeOfBirth: string | null;
  }>): Promise<boolean> => {
    try {
      const supabaseUpdates: any = {};
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.dateOfBirth !== undefined) {
        supabaseUpdates.date_of_birth = updates.dateOfBirth.toISOString().split('T')[0];
      }
      if (updates.timeOfBirth !== undefined) supabaseUpdates.time_of_birth = updates.timeOfBirth;
      if (updates.placeOfBirth !== undefined) supabaseUpdates.place_of_birth = updates.placeOfBirth;

      const { error } = await supabase
        .from('babies')
        .update(supabaseUpdates)
        .eq('id', babyId);

      if (error) throw error;

      setBabies(prev => prev.map(b => 
        b.id === babyId 
          ? { ...b, ...updates, updatedAt: new Date() }
          : b
      ));

      toast.success('Baby info updated');
      return true;
    } catch (error) {
      console.error('Error updating baby:', error);
      toast.error('Failed to update baby');
      return false;
    }
  };

  const deleteBaby = async (babyId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('babies')
        .delete()
        .eq('id', babyId);

      if (error) throw error;

      setBabies(prev => prev.filter(b => b.id !== babyId));
      toast.success('Baby timeline deleted');
      return true;
    } catch (error) {
      console.error('Error deleting baby:', error);
      toast.error('Failed to delete baby timeline');
      return false;
    }
  };

  const inviteUser = async (
    babyId: string,
    targetUserId: string,
    role: BabyAccessRole,
    permission?: AngelPermission
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('baby_access')
        .insert({
          baby_id: babyId,
          user_id: targetUserId,
          role,
          permission: role === 'angel' ? permission : null,
          status: 'pending',
          invited_by: userId,
        });

      if (error) throw error;

      toast.success(`Invitation sent as ${role}`);
      return true;
    } catch (error: any) {
      console.error('Error inviting user:', error);
      if (error.code === '23505') {
        toast.error('User already has access');
      } else {
        toast.error('Failed to send invitation');
      }
      return false;
    }
  };

  const acceptInvitation = async (accessId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('baby_access')
        .update({ status: 'accepted' })
        .eq('id', accessId);

      if (error) throw error;

      setPendingInvitations(prev => prev.filter(inv => inv.id !== accessId));
      await fetchBabies();
      toast.success('Invitation accepted!');
      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
      return false;
    }
  };

  const declineInvitation = async (accessId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('baby_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      setPendingInvitations(prev => prev.filter(inv => inv.id !== accessId));
      toast.success('Invitation declined');
      return true;
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
      return false;
    }
  };

  const getBabyAccess = async (babyId: string): Promise<BabyAccess[]> => {
    try {
      const { data, error } = await supabase
        .from('baby_access')
        .select('*')
        .eq('baby_id', babyId);

      if (error) throw error;

      // Fetch profile info
      const userIds = (data || []).map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map(a => {
        const profile = profileMap.get(a.user_id);
        return {
          id: a.id,
          babyId: a.baby_id,
          userId: a.user_id,
          role: a.role as BabyAccessRole,
          permission: a.permission as AngelPermission | undefined,
          status: a.status as AccessStatus,
          invitedBy: a.invited_by,
          createdAt: new Date(a.created_at),
          username: profile?.username,
          displayName: profile?.display_name,
          avatarUrl: profile?.avatar_url,
        };
      });
    } catch (error) {
      console.error('Error fetching baby access:', error);
      return [];
    }
  };

  const revokeAccess = async (accessId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('baby_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast.success('Access revoked');
      return true;
    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error('Failed to revoke access');
      return false;
    }
  };

  const canContribute = (baby: Baby): boolean => {
    // This would need to check baby_access, but for now assume if user can see baby, check their role
    // The actual permission check happens server-side via RLS
    return true; // Simplified - real check done via can_contribute_to_baby RPC
  };

  return {
    babies,
    pendingInvitations,
    loading,
    fetchBabies,
    createBaby,
    updateBaby,
    deleteBaby,
    inviteUser,
    acceptInvitation,
    declineInvitation,
    getBabyAccess,
    revokeAccess,
    canContribute,
  };
}

export function useShareMomentToBaby(userId: string | null) {
  const shareMomentToBaby = async (
    babyId: string,
    moment: {
      id?: string;
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
        .from('baby_moments')
        .insert({
          baby_id: babyId,
          original_moment_id: moment.id || null,
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

      return true;
    } catch (error) {
      console.error('Error sharing moment to baby:', error);
      toast.error('Failed to share moment to baby timeline');
      return false;
    }
  };

  return { shareMomentToBaby };
}
