import { Feather } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Button, Toggle, text } from '@/components/ui'
import { fireAlert } from '@/lib/alerts'
import { loadNative } from '@/lib/native'
import { api } from '@/lib/api'
import { getApiBase, guessApiBase } from '@/lib/config'
import { MY_LOCATION, PLACES, useBeacon } from '@/state/beacon'
import { colors } from '@/theme'

export default function Settings() {
  const { place, setPlace, radius, setRadius, sound, setSound, setServer, refresh, coords } = useBeacon()
  const [km, setKm] = useState(radius)
  const [gps, setGps] = useState('')
  const [soundMsg, setSoundMsg] = useState('')
  const [server, setServerText] = useState(getApiBase())
  const [conn, setConn] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const useMyLocation = async () => {
    setGps('Finding you…')
    try {
      const Location = await loadNative(() => import('expo-location'))
      if (!Location) return setGps("This version of Expo Go can't read your location. Pick an area below instead.")
      const perm = await Location.requestForegroundPermissionsAsync()
      if (perm.status !== 'granted') return setGps('Location is blocked. Allow it in your phone settings, or pick an area below.')
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setPlace(MY_LOCATION, [pos.coords.latitude, pos.coords.longitude])
      setGps('')
    } catch {
      setGps("Couldn't get your location. Pick an area below instead.")
    }
  }

  const toggleSound = async (on: boolean) => {
    setSoundMsg((await setSound(on)) ?? '')
  }

  const testServer = async () => {
    setTesting(true); setConn(null)
    setServer(server)
    try {
      const h = await api.health()
      setConn({ ok: true, msg: `Connected${h.llm_ok ? ' · Gemini on' : ' · Gemini off (' + h.llm_status + ')'}` })
      refresh()
    } catch {
      setConn({ ok: false, msg: `Can't reach ${getApiBase()}. Is the server running, and is the phone on the same Wi-Fi?` })
    } finally {
      setTesting(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <Text style={text.h2}>Settings</Text>

      <View>
        <Text style={s.label}>My area</Text>
        <Pressable onPress={useMyLocation} style={({ pressed }) => [s.gps, pressed && { backgroundColor: colors.subtle }]}>
          <Feather name="navigation" size={16} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>Use my current location</Text>
            <Text style={text.faint}>Only a rounded area (about 1 km) leaves your phone</Text>
          </View>
          {place === MY_LOCATION && <Feather name="check" size={18} color={colors.accent} />}
        </Pressable>
        {!!gps && <Text style={[text.faint, { marginTop: 6 }]}>{gps}</Text>}
        <View style={s.list}>
          {Object.keys(PLACES).map((p, i) => (
            <Pressable key={p} onPress={() => { setPlace(p); setGps('') }} style={[s.option, i > 0 && s.divider]}>
              <Text style={{ fontSize: 15, color: colors.ink, flex: 1 }}>{p}</Text>
              {place === p && <Feather name="check" size={18} color={colors.accent} />}
            </Pressable>
          ))}
        </View>
        {place === MY_LOCATION && <Text style={[text.faint, { marginTop: 6 }]}>Showing {coords[0].toFixed(2)}, {coords[1].toFixed(2)}</Text>}
      </View>

      <View>
        <Text style={s.label}>Alert radius: {km} km</Text>
        <Slider
          minimumValue={2}
          maximumValue={50}
          step={1}
          value={radius}
          onValueChange={setKm}
          onSlidingComplete={(v) => setRadius(Math.round(v))}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.line}
          thumbTintColor={colors.accent}
        />
      </View>

      <View>
        <View style={s.row}>
          <Feather name={sound ? 'bell' : 'bell-off'} size={17} color={colors.ink} />
          <Text style={{ fontSize: 14, color: colors.ink, flex: 1 }}>Alert sound & notifications</Text>
          <Toggle value={sound} onValueChange={toggleSound} />
        </View>
        {!!soundMsg && <Text style={[text.faint, { color: '#9F1239', marginTop: 6 }]}>{soundMsg}</Text>}
        {sound && <Button kind="ghost" title="Test alert" icon="bell" onPress={() => fireAlert('Beacon test alert', 'This is how a real alert will look and sound.')} style={{ marginTop: 10 }} />}
      </View>

      <View>
        <Text style={s.label}>Server address</Text>
        <TextInput
          value={server}
          onChangeText={setServerText}
          placeholder={guessApiBase()}
          placeholderTextColor={colors.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={s.input}
          accessibilityLabel="Server address"
        />
        <Text style={[text.faint, { marginTop: 6 }]}>The computer running SachVerify, for example http://192.168.1.20:8000. Your phone must be on the same Wi-Fi.</Text>
        <Button kind="ghost" title={testing ? 'Testing…' : 'Save and test connection'} onPress={testServer} disabled={testing} style={{ marginTop: 10 }} />
        {conn && (
          <View style={[s.conn, { backgroundColor: conn.ok ? '#ECFDF5' : '#FFF1F2', borderColor: conn.ok ? '#A7F3D0' : '#FECDD3' }]}>
            <Feather name={conn.ok ? 'check-circle' : 'wifi-off'} size={15} color={conn.ok ? '#047857' : '#9F1239'} />
            <Text style={{ flex: 1, fontSize: 12.5, color: conn.ok ? '#065F46' : '#881337' }}>{conn.msg}</Text>
          </View>
        )}
      </View>

      <Text style={[text.faint, { lineHeight: 18 }]}>
        Your exact location stays on this phone; the server only sees a rounded area. Demo areas use synthetic scenario data where marked.
      </Text>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 22, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 8 },
  gps: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginBottom: 10 },
  list: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.ink, backgroundColor: colors.subtle },
  conn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
})
