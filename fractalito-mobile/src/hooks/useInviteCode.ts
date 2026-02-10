import { supabase } from '../integrations/supabase/client';

/**
 * Redeem an invite code - uses a database function to create bidirectional connections
 * One invite link can be used by multiple users
 */
export async function redeemInviteCode(userId: string): Promise<boolean> {
  const inviteCode = localStorage.getItem('pending_invite_code');
  if (!inviteCode) return false;

  try {
    // Call the database function to redeem the invite code
    // This handles all validation and creates bidirectional connections
    const { data: success, error } = await supabase
      .rpc('redeem_invite_code', { invite_code: inviteCode });

    // Clear the stored invite code regardless of outcome
    localStorage.removeItem('pending_invite_code');

    if (error) {
      console.error('Error redeeming invite code:', error);
      return false;
    }

    if (!success) {
      console.log('Invite code invalid, expired, or is your own code');
      return false;
    }

    // Get inviter's username for the toast by looking up the invite code
    const { data: invite } = await supabase
      .from('invite_codes')
      .select('inviter_user_id')
      .eq('code', inviteCode)
      .maybeSingle();

    if (invite?.inviter_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', invite.inviter_user_id)
        .maybeSingle();

      if (profile?.username) {
        console.log(`You're now connected with @${profile.username}!`);
      } else {
        console.log('Invite redeemed! You are now connected.');
      }
    } else {
      console.log('Invite redeemed! You are now connected.');
    }

    return true;
  } catch (error) {
    console.error('Error redeeming invite code:', error);
    localStorage.removeItem('pending_invite_code');
    return false;
  }
}
