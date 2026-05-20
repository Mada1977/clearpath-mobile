import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { PremiumProvider } from '../src/context/PremiumContext';
import { registerPushToken, markActive, scheduleLocalNotification, cancelAllScheduled } from '../src/services/notifications';
import { configurePurchases } from '../src/services/purchases';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      configurePurchases(user.id);
      registerPushToken();
      markActive();
      // Schedule a local reminder 24h from now; cancel any stale one first
      cancelAllScheduled().then(() => {
        scheduleLocalNotification(
          'How are you doing today? 💙',
          'Open Bravely Path to log your progress and chat with your AI coach.',
          24,
        );
      });
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Logged in — check if onboarding is complete
    AsyncStorage.getItem('bravelypath_onboarded').then(done => {
      if (!done && !inOnboarding) {
        router.replace('/onboarding');
      } else if (done && (inAuth || inOnboarding)) {
        router.replace('/(tabs)');
      }
    });
  }, [user, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="supporter-dashboard" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PremiumProvider>
        <StatusBar style="auto" />
        <RootLayoutNav />
      </PremiumProvider>
    </AuthProvider>
  );
}
