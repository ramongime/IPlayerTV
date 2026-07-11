import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/lib/theme';
import { SymbolView } from 'expo-symbols';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <SymbolView
      name={name}
      size={22}
      tintColor={focused ? colors.accent : colors.textMuted}
      weight="medium"
    />
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
          tabBarIcon: ({ focused }) => <TabIcon name="tv" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: t('tabs.movie'),
          tabBarIcon: ({ focused }) => <TabIcon name="film" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: t('tabs.series'),
          tabBarIcon: ({ focused }) => <TabIcon name="play.rectangle.on.rectangle" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('common.favorites'),
          tabBarIcon: ({ focused }) => <TabIcon name="star.fill" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('common.settings'),
          tabBarIcon: ({ focused }) => <TabIcon name="gearshape" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
