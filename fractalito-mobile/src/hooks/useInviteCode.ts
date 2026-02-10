import { supabase } from '../integrations/supabase/client';
import { toast } from './use-toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
//manages invites for individual connections - redeeming invite codes, generating invite codes, and listing pending invites
/**
 * Redeem an invite code - uses a database function to create bidirectional connections
 * One invite link can be used by multiple users
 */
export async function redeemInviteCode(userId: string): Promise<boolean> {
  const inviteCode = await AsyncStorage.getItem('pending_invite_code');
  if (!inviteCode) return false;

  try {
    // Call the database function to redeem the invite code
    // This handles all validation and creates bidirectional connections
    const { data: success, error } = await supabase
      .rpc('redeem_invite_code', { invite_code: inviteCode });

    // Clear the stored invite code regardless of outcome
    await AsyncStorage.removeItem('pending_invite_code');

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
        toast({ title: `You're now connected with @${profile.username}!` });
      } else {
        toast({ title: 'Invite redeemed! You are now connected.' });
      }
    } else {
      toast({ title: 'Invite redeemed! You are now connected.' });
    }

    return true;
  } catch (error) {
    console.error('Error redeeming invite code:', error);
    await AsyncStorage.removeItem('pending_invite_code');
    return false;
  }
}
