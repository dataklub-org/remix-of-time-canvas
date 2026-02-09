import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

interface InviteCode {
  id: string;
  code: string;
  usedByUserId: string | null;
  usedAt: string | null;
  createdAt: string;
}

export default function ProfileScreen() {
  // State from web version
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<'initial' | 'confirm-moments' | 'confirm-account'>('initial');
  const [isDeleting, setIsDeleting] = useState(false);

  // Mock user data - will be replaced with real hooks
  const user = { id: '1', email: 'user@example.com' };
  const profile = { username: 'username', full_name: 'User Name' };

  useEffect(() => {
    loadInviteCodes();
  }, []);

  const loadInviteCodes = async () => {
    // Logic will be added when we copy hooks
    console.log('Loading invite codes');
  };

  const generateInviteCode = async () => {
    // Logic will be added when we copy hooks
    console.log('Generating invite code');
  };

  const copyInviteLink = async (code: string) => {
    // Logic will be added when we copy hooks
    console.log('Copy invite link:', code);
  };

  const deleteInviteCode = async (codeId: string) => {
    Alert.alert(
      'Delete Invite Code',
      'Are you sure you want to delete this invite code?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          console.log('Delete code:', codeId);
        }},
      ]
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will delete all your personal moments. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setDeleteStep('initial') },
        { text: 'Delete', style: 'destructive', onPress: () => {
          console.log('Delete all data');
          setDeleteStep('initial');
        }},
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setDeleteStep('initial') },
        { text: 'Delete Forever', style: 'destructive', onPress: () => {
          console.log('Delete account');
          setDeleteStep('initial');
        }},
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardDescription}>Manage your account information</Text>

          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={profile.username}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={profile.full_name || ''}
              placeholder="Enter your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={user.email}
              editable={false}
            />
          </View>
        </View>

        {/* Invite Codes Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Invite Codes</Text>
              <Text style={styles.cardDescription}>
                Share Fractalito with friends
              </Text>
            </View>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateInviteCode}
              disabled={generatingCode}
            >
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
              <Text style={styles.emptySubtext}>
                Generate a code to invite friends
              </Text>
            </View>
          ) : (
            <View style={styles.codesList}>
              {inviteCodes.map((code) => (
                <View key={code.id} style={styles.codeItem}>
                  <View style={styles.codeInfo}>
                    <Text style={styles.codeText}>{code.code}</Text>
                    <Text style={styles.codeStatus}>
                      {code.usedAt ? '✓ Used' : 'Available'}
                    </Text>
                  </View>
                  <View style={styles.codeActions}>
                    <TouchableOpacity
                      onPress={() => copyInviteLink(code.code)}
                      style={styles.iconButton}
                    >
                      <Text style={styles.iconText}>
                        {copiedCode === code.code ? '✓' : '📋'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteInviteCode(code.id)}
                      style={styles.iconButton}
                    >
                      <Text style={styles.iconTextDelete}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Danger Zone Card */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.cardTitle}>Danger Zone</Text>
          <Text style={styles.cardDescription}>
            Irreversible actions
          </Text>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={startDeleteMomentsFlow}
            disabled={isDeleting}
          >
            <Text style={styles.dangerButtonText}>Delete All My Moments</Text>
            <Text style={styles.dangerButtonSubtext}>
              Remove all personal moments from your timeline
            </Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={startDeleteAccountFlow}
            disabled={isDeleting}
          >
            <Text style={styles.dangerButtonText}>Delete My Account</Text>
            <Text style={styles.dangerButtonSubtext}>
              Permanently delete your account and all data
            </Text>
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
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
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
});
