import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { BeaconProvider } from '@/state/beacon'

export default function RootLayout() {
  return (
    <BeaconProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="why" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </BeaconProvider>
  )
}
