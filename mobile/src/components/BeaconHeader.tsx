import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBeacon } from '@/state/beacon'
import { colors } from '@/theme'

/** The dark top bar from the web app: logo, current area, settings. */
export default function BeaconHeader() {
  const insets = useSafeAreaInsets()
  const { place } = useBeacon()
  return (
    <View style={[s.bar, { paddingTop: insets.top + 10 }]}>
      <View style={s.brand}>
        <View style={s.logo}><Feather name="shield" size={15} color="#fff" /></View>
        <Text style={s.name}>Beacon</Text>
      </View>
      <Pressable onPress={() => router.navigate('/settings')} style={s.pill} accessibilityLabel={`Area: ${place}. Open settings`}>
        <Feather name="map-pin" size={12} color="#fff" />
        <Text numberOfLines={1} style={s.pillText}>{place}</Text>
      </Pressable>
      <Pressable onPress={() => router.navigate('/settings')} hitSlop={10} accessibilityLabel="Settings">
        <Feather name="settings" size={18} color="#fff" />
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: colors.night, paddingHorizontal: 16, paddingBottom: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pill: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  pillText: { color: '#fff', fontSize: 12, flexShrink: 1 },
})
