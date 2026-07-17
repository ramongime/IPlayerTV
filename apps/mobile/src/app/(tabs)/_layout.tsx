import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { colors } from '@/lib/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {emoji}
    </Text>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.live'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="📺" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: t('tabs.movie'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: t('tabs.series'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎞️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('common.favorites'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('common.settings'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
