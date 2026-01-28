import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Trash2, Link2, Copy, Check, Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

interface InviteCode {
  id: string;
  code: string;
  usedByUserId: string | null;
  usedAt: string | null;
  createdAt: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading } = useAuth();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<'initial' | 'confirm'>('initial');
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  // Load invite codes
  useEffect(() => {
    if (user?.id) {
      loadInviteCodes();
    }
  }, [user?.id]);

  const loadInviteCodes = async () => {
    if (!user?.id) return;
    setLoadingCodes(true);
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('inviter_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInviteCodes(
        (data || []).map((row) => ({
          id: row.id,
          code: row.code,
          usedByUserId: row.used_by_user_id,
          usedAt: row.used_at,
          createdAt: row.created_at,
        }))
      );
    } catch (error) {
      console.error('Error loading invite codes:', error);
    } finally {
      setLoadingCodes(false);
    }
  };

  const generateInviteCode = async () => {
    if (!user?.id) return;
    setGeneratingCode(true);
    try {
      const code = nanoid(10);
      const { error } = await supabase
        .from('invite_codes')
        .insert({
          code,
          inviter_user_id: user.id,
        });

      if (error) throw error;

      toast.success('Invite link generated!');
      loadInviteCodes();
    } catch (error) {
      console.error('Error generating invite code:', error);
      toast.error('Failed to generate invite link');
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyInviteLink = async (code: string) => {
    const link = `${window.location.origin}/auth?invite=${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(code);
    toast.success('Invite link copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const deleteInviteCode = async (codeId: string) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;

      toast.success('Invite code deleted');
      loadInviteCodes();
    } catch (error) {
      console.error('Error deleting invite code:', error);
      toast.error('Failed to delete invite code');
    }
  };

  const handleDeleteAllData = async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    try {
      // Get user's default timeline
      const { data: timeline } = await supabase
        .from('timelines')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (timeline?.id) {
        // Delete all moments from the user's MyLife timeline
        const { error } = await supabase
          .from('moments')
          .delete()
          .eq('user_id', user.id)
          .eq('timeline_id', timeline.id);

        if (error) throw error;
      }

      toast.success('All your personal moments have been deleted');
      setDeleteStep('initial');
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Error deleting data:', error);
      toast.error('Failed to delete data');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        {/* Profile Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatarUrl || undefined} />
                <AvatarFallback className="text-xl">
                  {profile?.username?.[0]?.toUpperCase() || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">
                  @{profile?.username || 'Unknown'}
                </CardTitle>
                {profile?.displayName && (
                  <CardDescription>{profile.displayName}</CardDescription>
                )}
                <CardDescription className="text-xs mt-1">
                  {user?.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Invite Links */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5" />
              Invite Links
            </CardTitle>
            <CardDescription>
              Share invite links to connect with friends. They'll be added to your circle after signing up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={generateInviteCode}
              disabled={generatingCode}
              className="w-full"
            >
              {generatingCode ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Generate New Invite Link
            </Button>

            {loadingCodes ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : inviteCodes.length > 0 ? (
              <div className="space-y-2">
                {inviteCodes.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono truncate block">
                        {invite.code}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        {invite.usedByUserId ? (
                          <span className="text-green-600">Used</span>
                        ) : (
                          'Available'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!invite.usedByUserId && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyInviteLink(invite.code)}
                          >
                            {copiedCode === invite.code ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteInviteCode(invite.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No invite links yet. Generate one to share with friends!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={deleteStep !== 'initial'} onOpenChange={(open) => !open && setDeleteStep('initial')}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteStep('confirm')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All My Moments
                </Button>
              </AlertDialogTrigger>
              
              {/* First confirmation */}
              {deleteStep === 'confirm' && (
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Are you sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>all moments from your personal MyLife timeline</strong>. 
                      Group-shared moments will remain accessible to other group members.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteAllData();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Yes, Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              )}
            </AlertDialog>
            
            <p className="text-xs text-muted-foreground mt-2 text-center">
              This action cannot be undone. Group moments are preserved.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
