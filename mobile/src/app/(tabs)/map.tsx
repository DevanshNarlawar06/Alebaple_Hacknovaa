import { ScrollView, StyleSheet, Text } from 'react-native'
import LeafletMap from '@/components/LeafletMap'
import { text } from '@/components/ui'
import { useBeacon } from '@/state/beacon'

export default function MapTab() {
  const { coords, radius, status } = useBeacon()
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={text.h2}>Map</Text>
      <LeafletMap lat={coords[0]} lon={coords[1]} radiusKm={radius} claims={status?.nearby_claims ?? []} />
      <Text style={text.faint}>Teal circle: your area ({radius} km). Dots: reports, coloured by verdict.</Text>
    </ScrollView>
  )
}

const s = StyleSheet.create({ page: { padding: 16, gap: 12 } })
