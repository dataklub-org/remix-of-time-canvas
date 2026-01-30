import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Redeem a group invite code - adds user to group and creates bidirectional connections with inviter
 */
export async function redeemGroupInviteCode(userId: string): Promise<boolean> {
  const inviteCode = localStorage.getItem('pending_group_invite_code');
  if (!inviteCode) return false;

  try {
    // Call the database function to redeem the group invite code
    const { data: success, error } = await supabase
      .rpc('redeem_group_invite_code', { invite_code: inviteCode });

    // Clear the stored invite code regardless of outcome
    localStorage.removeItem('pending_group_invite_code');

    if (error) {
      console.error('Error redeeming group invite code:', error);
      return false;
    }

    if (!success) {
      console.log('Group invite code invalid, expired, or already a member');
      return false;
    }

    // Get group info for the toast
    const { data: codeInfo } = await supabase
      .rpc('validate_group_invite_code', { code_to_validate: inviteCode });

    if (codeInfo && codeInfo.length > 0 && codeInfo[0].group_name) {
      toast.success(`You joined "${codeInfo[0].group_name}"!`);
    } else {
      toast.success('You joined the group!');
    }

    return true;
  } catch (error) {
    console.error('Error redeeming group invite code:', error);
    localStorage.removeItem('pending_group_invite_code');
    return false;
  }
}

/**
 * Validate a group invite code without redeeming it
 */
export async function validateGroupInviteCode(code: string): Promise<{
  isValid: boolean;
  groupName?: string;
  inviterUsername?: string;
}> {
  try {
    const { data, error } = await supabase
      .rpc('validate_group_invite_code', { code_to_validate: code });

    if (error) {
      console.error('Error validating group invite code:', error);
      return { isValid: false };
    }

    if (!data || data.length === 0) {
      return { isValid: false };
    }

    const result = data[0];
    return {
      isValid: result.is_valid === true,
      groupName: result.group_name || undefined,
      inviterUsername: result.inviter_username || undefined,
    };
  } catch (error) {
    console.error('Error validating group invite code:', error);
    return { isValid: false };
  }
}
