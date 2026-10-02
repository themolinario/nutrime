import { Redirect, Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeveloperBanner } from '../../components/DeveloperBanner';
import { useDietStore } from '../../lib/store/useDietStore';
import { colors, fonts } from '../../theme';
import { Icon } from '../../components/Icon';

export default function TabsLayout() {
  const hasPlan = useDietStore((s) => s.plan !== null);
  // Android draws edge to edge: the bar grows by the gesture/navigation area below it.
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? 0 : insets.bottom;
  const tabBarHeight = (Platform.OS === 'ios' ? 86 : 64) + bottomInset;
  if (!hasPlan) return <Redirect href="/importa" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.green,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingTop: 8,
            ...(bottomInset ? { paddingBottom: bottomInset } : null),
          },
          tabBarLabelStyle: {
            fontFamily: fonts.bodySemi,
            fontSize: 11,
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="oggi"
          options={{
            tabBarButtonTestID: 'tab-oggi',
            title: 'Oggi',
            tabBarIcon: ({ color, size, focused }) => (
              <Icon
                name="today-outline"
                size={size}
                color={color}
                weight={focused ? 'fill' : 'duotone'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settimana"
          options={{
            tabBarButtonTestID: 'tab-settimana',
            title: 'Settimana',
            tabBarIcon: ({ color, size, focused }) => (
              <Icon
                name="calendar-outline"
                size={size}
                color={color}
                weight={focused ? 'fill' : 'duotone'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="spesa"
          options={{
            tabBarButtonTestID: 'tab-spesa',
            title: 'Spesa',
            tabBarIcon: ({ color, size, focused }) => (
              <Icon
                name="cart-outline"
                size={size}
                color={color}
                weight={focused ? 'fill' : 'duotone'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="piano"
          options={{
            tabBarButtonTestID: 'tab-piano',
            title: 'Piano',
            tabBarIcon: ({ color, size, focused }) => (
              <Icon
                name="document-text-outline"
                size={size}
                color={color}
                weight={focused ? 'fill' : 'duotone'}
              />
            ),
          }}
        />
      </Tabs>
      <DeveloperBanner bottom={tabBarHeight + 10} />
    </View>
  );
}
