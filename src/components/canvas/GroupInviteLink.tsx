import { useState, useEffect } from 'react';
import { Link2, Copy, Check, Loader2, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GroupInviteLinkProps {
  groupId: string;
  userId: string;
}

interface GroupInviteCode {
  id: string;
  code: string;
  createdAt: string;
}

export function GroupInviteLink({ groupId, userId }: GroupInviteLinkProps) {
  const [inviteCode, setInviteCode] = useState<GroupInviteCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchInviteCode();
  }, [groupId, userId]);

  const fetchInviteCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_invite_codes')
        .select('id, code, created_at')
        .eq('group_id', groupId)
        .eq('inviter_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setInviteCode({
          id: data.id,
          code: data.code,
          createdAt: data.created_at,
        });
      }
    } catch (error) {
      console.error('Error fetching group invite code:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    setGenerating(true);
    try {
      const code = nanoid(10);
      const { data, error } = await supabase
        .from('group_invite_codes')
        .insert({
          code,
          group_id: groupId,
          inviter_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setInviteCode({
        id: data.id,
        code: data.code,
        createdAt: data.created_at,
      });
      toast.success('Invite link generated!');
    } catch (error) {
      console.error('Error generating group invite code:', error);
      toast.error('Failed to generate invite link');
    } finally {
      setGenerating(false);
    }
  };

  const deleteInviteCode = async () => {
    if (!inviteCode) return;
    
    try {
      const { error } = await supabase
        .from('group_invite_codes')
        .delete()
        .eq('id', inviteCode.id);

      if (error) throw error;

      setInviteCode(null);
      toast.success('Invite link deleted');
    } catch (error) {
      console.error('Error deleting group invite code:', error);
      toast.error('Failed to delete invite link');
    }
  };

  const copyToClipboard = async () => {
    if (!inviteCode) return;
    
    const inviteUrl = `${window.location.origin}/auth?group_invite=${inviteCode.code}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inviteCode) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={generateInviteCode}
        disabled={generating}
        className="w-full text-xs h-8"
      >
        {generating ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
        ) : (
          <Link2 className="h-3 w-3 mr-1.5" />
        )}
        Generate Invite Link
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={copyToClipboard}
        className="flex-1 text-xs h-8 justify-start"
      >
        {copied ? (
          <Check className="h-3 w-3 mr-1.5 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 mr-1.5" />
        )}
        {copied ? 'Copied!' : 'Copy Invite Link'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={deleteInviteCode}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
