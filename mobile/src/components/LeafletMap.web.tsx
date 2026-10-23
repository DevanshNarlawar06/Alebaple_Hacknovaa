import { createElement } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors } from '@/theme'
import { leafletHtml, type MapProps } from './leafletHtml'

/** Web version of the map: the same page in an iframe (react-native-webview has no web support). */
export default function LeafletMap(props: MapProps) {
  return (
    <View style={s.box}>
      {createElement('iframe', { srcDoc: leafletHtml(props), style: { border: 0, width: '100%', height: '100%' }, title: 'Map' })}
    </View>
  )
}

const s = StyleSheet.create({
  box: { height: 420, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
})
