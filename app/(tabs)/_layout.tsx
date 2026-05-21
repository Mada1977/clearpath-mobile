import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../src/constants';
import { CrisisButton } from '../../src/components/CrisisButton';

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { borderTopColor: COLORS.border, backgroundColor: COLORS.card },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.aiCoach'),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: t('tabs.sos'),
          tabBarIcon: ({ color, size }) => <Ionicons name="flash-outline" size={size} color={color} />,
          tabBarActiveTintColor: COLORS.danger,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('tabs.progress'),
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trackers"
        options={{
          title: t('tabs.trackers'),
          tabBarIcon: ({ color, size }) => <Ionicons name="timer-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: t('tabs.log'),
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
    <CrisisButton />
    </View>
  );
}
