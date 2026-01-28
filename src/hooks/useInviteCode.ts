import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Redeem an invite code - the database trigger handles creating bidirectional connections
 */
export async function redeemInviteCode(userId: string): Promise<boolean> {
  const inviteCode = localStorage.getItem('pending_invite_code');
  if (!inviteCode) return false;

  try {
    // Get the invite code details
    const { data: invite, error: fetchError } = await supabase
      .from('invite_codes')
      .select('id, inviter_user_id, used_by_user_id')
      .eq('code', inviteCode)
      .maybeSingle();

    if (fetchError || !invite) {
      console.error('Invalid invite code:', fetchError);
      localStorage.removeItem('pending_invite_code');
      return false;
    }

    if (invite.used_by_user_id) {
      console.log('Invite code already used');
      localStorage.removeItem('pending_invite_code');
      return false;
    }

    // Don't let users invite themselves
    if (invite.inviter_user_id === userId) {
      console.log('Cannot use own invite code');
      localStorage.removeItem('pending_invite_code');
      return false;
    }

    // Update the invite code as used - the database trigger will create connections
    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({
        used_by_user_id: userId,
        used_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error updating invite code:', updateError);
      localStorage.removeItem('pending_invite_code');
      return false;
    }

    // Clear the stored invite code
    localStorage.removeItem('pending_invite_code');

    // Get inviter's username for the toast
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', invite.inviter_user_id)
      .maybeSingle();

    if (profile?.username) {
      toast.success(`You're now connected with @${profile.username}!`);
    } else {
      toast.success('Invite redeemed! You are now connected.');
    }

    return true;
  } catch (error) {
    console.error('Error redeeming invite code:', error);
    localStorage.removeItem('pending_invite_code');
    return false;
  }
}
