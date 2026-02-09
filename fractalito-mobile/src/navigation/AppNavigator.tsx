import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IndexScreen from '../screens/home/IndexScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Define screen names and params
export type RootStackParamList = {
  Index: undefined;
  Auth: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Index"
        screenOptions={{
          headerShown: false, // Hide headers for now (like web)
        }}
      >
        <Stack.Screen name="Index" component={IndexScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
