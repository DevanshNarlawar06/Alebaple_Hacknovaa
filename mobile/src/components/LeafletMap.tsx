import { Component, lazy, Suspense, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors } from '@/theme'
import { leafletHtml, type MapProps } from './leafletHtml'

// Loaded on demand: if this build of Expo Go has no WebView, only the map is lost, not the whole app.
const WebView = lazy(() => import('react-native-webview').then((m) => ({ default: m.WebView })))

class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <View style={[s.box, s.center]}>
        <Text style={{ color: colors.ink2, textAlign: 'center', padding: 24 }}>The map is not available in this version of Expo Go. Everything else works.</Text>
      </View>
    )
  }
}

/** Native map (Android and iOS). The web build uses LeafletMap.web.tsx instead. */
export default function LeafletMap(props: MapProps) {
  return (
    <MapBoundary>
      <Suspense fallback={<View style={[s.box, s.center]}><ActivityIndicator color={colors.accent} /></View>}>
        <View style={s.box}>
          <WebView
            key={`${props.lat},${props.lon},${props.radiusKm},${props.claims.length}`}
            originWhitelist={['*']}
            source={{ html: leafletHtml(props) }}
            style={{ flex: 1, backgroundColor: '#f6f6f6' }}
            javaScriptEnabled
            scrollEnabled={false}
          />
        </View>
      </Suspense>
    </MapBoundary>
  )
}

const s = StyleSheet.create({
  box: { height: 420, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  center: { alignItems: 'center', justifyContent: 'center' },
})
