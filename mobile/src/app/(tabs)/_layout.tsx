import { Feather } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BeaconHeader from '@/components/BeaconHeader'
import { colors } from '@/theme'

const icon = (name: React.ComponentProps<typeof Feather>['name']) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Feather name={name} size={size} color={color as string} />
  }

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        header: () => <BeaconHeader />,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.ink2,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.line, height: 72 + insets.bottom, paddingTop: 6, paddingBottom: 6 + insets.bottom },
        sceneStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: icon('map') }} />
      <Tabs.Screen name="check" options={{ title: 'Check', tabBarIcon: icon('message-square') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  )
}
