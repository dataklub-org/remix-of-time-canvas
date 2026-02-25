import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useCallback, useEffect } from 'react';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IndexScreen from '../screens/home/IndexScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { useAuth } from '../hooks/useAuth';
import { redeemInviteCode } from '../hooks/useInviteCode';
import { redeemGroupInviteCode } from '../hooks/useGroupInviteCode';

// Define screen names and params
export type RootStackParamList = {
  Index: undefined;
  Auth: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, loading, user } = useAuth();

  const handleInviteLink = useCallback(
    async (url: string) => {
      try {
        const parsed = Linking.parse(url);
        const invite = parsed.queryParams?.invite;
        const groupInvite = parsed.queryParams?.group_invite;

        if (invite) {
          await AsyncStorage.setItem('pending_invite_code', String(invite));
        }
        if (groupInvite) {
          await AsyncStorage.setItem('pending_group_invite_code', String(groupInvite));
        }

        if (isAuthenticated && user?.id) {
          if (invite) await redeemInviteCode(user.id);
          if (groupInvite) await redeemGroupInviteCode(user.id);
        }
      } catch (error) {
        console.error('Error handling invite link:', error);
      }
    },
    [isAuthenticated, user?.id]
  );

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleInviteLink(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleInviteLink(url);
    });
    return () => subscription.remove();
  }, [handleInviteLink]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={isAuthenticated ? "Index" : "Auth"}
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          // Authenticated screens
          <>
            <Stack.Screen name="Index" component={IndexScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          // Not authenticated - show auth screen
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
