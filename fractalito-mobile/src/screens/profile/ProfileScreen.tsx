import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../integrations/supabase/client';
import { nanoid } from 'nanoid';

interface InviteCode {
  id: string;
  code: string;
  usedByUserId: string | null;
  usedAt: string | null;
  createdAt: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, profile, signOut } = useAuth();

  // State from web version
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<'initial' | 'confirm-moments' | 'confirm-account'>('initial');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadInviteCodes();
    }
  }, [user?.id]);

  const loadInviteCodes = async () => {
    if (!user?.id) return;
    console.log('📋 Loading invite codes...');
    setLoadingCodes(true);
    setErrorMessage(null);
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
      console.log('✅ Loaded', data?.length || 0, 'invite codes');
    } catch (error) {
      console.error('❌ Error loading invite codes:', error);
      setErrorMessage('Failed to load invite codes.');
    } finally {
      setLoadingCodes(false);
    }
  };

  const generateInviteCode = async () => {
    if (!user?.id) return;
    console.log('🔑 Generating invite code...');
    setGeneratingCode(true);
    setErrorMessage(null);
    try {
      const code = nanoid(10);
      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          code,
          inviter_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Generated code:', code);
      await loadInviteCodes();
    } catch (error) {
      console.error('❌ Error generating invite code:', error);
      Alert.alert('Error', 'Failed to generate invite code');
      setErrorMessage('Failed to generate invite code.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyInviteLink = async (code: string) => {
    const inviteLink = `https://fractalito.com/auth?invite=${code}`;
    Clipboard.setString(inviteLink);
    setCopiedCode(code);
    console.log('📋 Copied invite link:', inviteLink);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const deleteInviteCode = async (codeId: string) => {
    Alert.alert(
      'Delete Invite Code',
      'Are you sure you want to delete this invite code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑 Deleting code:', codeId);
            setErrorMessage(null);
            try {
              const { error } = await supabase
                .from('invite_codes')
                .delete()
                .eq('id', codeId);

              if (error) throw error;

              console.log('✅ Code deleted');
              await loadInviteCodes();
            } catch (error) {
              console.error('❌ Error deleting code:', error);
              Alert.alert('Error', 'Failed to delete invite code');
              setErrorMessage('Failed to delete invite code.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          console.log('👋 Signing out...');
          const { error } = await signOut();
          if (error) {
            console.error('❌ Error signing out:', error);
            Alert.alert('Error', 'Failed to sign out');
          } else {
            console.log('✅ Signed out successfully');
          }
        },
      },
    ]);
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will delete all your personal moments. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setDeleteStep('initial') },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            console.log('🗑 Deleting all moments...');
            setIsDeleting(true);
            try {
              const { error } = await supabase
                .from('moments')
                .delete()
                .eq('user_id', user.id);

              if (error) throw error;

              console.log('✅ All moments deleted');
              Alert.alert('Success', 'All your moments have been deleted');
            } catch (error) {
              console.error('❌ Error deleting moments:', error);
              Alert.alert('Error', 'Failed to delete moments');
            } finally {
              setIsDeleting(false);
              setDeleteStep('initial');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setDeleteStep('initial') },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑 Deleting account...');
            setIsDeleting(true);
            try {
              // Call the delete account edge function
              const { error } = await supabase.functions.invoke('delete-account');

              if (error) throw error;

              console.log('✅ Account deleted');
            } catch (error) {
              // Silent failure: redirect to sign-in regardless
            } finally {
              // Ensure we leave the authenticated stack
              await signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' as never }],
              });
              setIsDeleting(false);
              setDeleteStep('initial');
            }
          },
        },
      ]
    );
  };

  const startDeleteMomentsFlow = () => {
    setDeleteStep('confirm-moments');
    handleDeleteAllData();
  };

  const startDeleteAccountFlow = () => {
    setDeleteStep('confirm-account');
    handleDeleteAccount();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardDescription}>Manage your account information</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profile</Text>
            <Text style={styles.cardDescription}>Manage your account information</Text>

            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.valueText}>@{profile?.username || ''}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <Text style={styles.valueText}>{profile?.displayName || ''}</Text>
            </View>
          </View>
        </View>

        {/* Invite Codes Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Invite Codes</Text>
              <Text style={styles.cardDescription}>Share Fractalito with friends</Text>
            </View>
            <TouchableOpacity style={styles.generateButton} onPress={generateInviteCode} disabled={generatingCode}>
              {generatingCode ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.generateButtonText}>+ Generate</Text>
              )}
            </TouchableOpacity>
          </View>

          {loadingCodes ? (
            <ActivityIndicator style={styles.loader} />
          ) : inviteCodes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No invite codes yet</Text>
              <Text style={styles.emptySubtext}>Generate a code to invite friends</Text>
            </View>
          ) : (
            <View style={styles.codesList}>
              {inviteCodes.map((code) => (
                <View key={code.id} style={styles.codeItem}>
                  <View style={styles.codeInfo}>
                    <Text style={styles.codeText}>{code.code}</Text>
                    <Text style={styles.codeStatus}>{code.usedAt ? '✓ Used' : 'Available'}</Text>
                  </View>
                  <View style={styles.codeActions}>
                    <TouchableOpacity onPress={() => copyInviteLink(code.code)} style={styles.iconButton}>
                      <Text style={styles.iconText}>{copiedCode === code.code ? '✓' : '📋'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteInviteCode(code.id)} style={styles.iconButton}>
                      <Text style={styles.iconTextDelete}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Danger Zone Card */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.cardTitle}>Danger Zone</Text>
          <Text style={styles.cardDescription}>Irreversible actions</Text>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.dangerButton} onPress={startDeleteMomentsFlow} disabled={isDeleting}>
            <Text style={styles.dangerButtonText}>Delete All My Moments</Text>
            <Text style={styles.dangerButtonSubtext}>Remove all personal moments from your timeline</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.dangerButton} onPress={startDeleteAccountFlow} disabled={isDeleting}>
            <Text style={styles.dangerButtonText}>Delete My Account</Text>
            <Text style={styles.dangerButtonSubtext}>Permanently delete your account and all data</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
    marginTop: 40,
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  valueText: {
    fontSize: 16,
    color: '#111',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loader: {
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  errorBanner: {
    backgroundColor: '#fee',
    borderColor: '#fca5a5',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  codesList: {
    marginTop: 8,
  },
  codeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  codeInfo: {
    flex: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  codeStatus: {
    fontSize: 12,
    color: '#666',
  },
  codeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  iconText: {
    fontSize: 18,
  },
  iconTextDelete: {
    fontSize: 18,
    color: '#ef4444',
  },
  dangerCard: {
    borderColor: '#fee',
    borderWidth: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  dangerButton: {
    paddingVertical: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  dangerButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  signOutButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
