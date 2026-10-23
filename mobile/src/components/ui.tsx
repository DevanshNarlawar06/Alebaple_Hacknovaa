import { Feather } from '@expo/vector-icons'
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import {
  Animated, Easing, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native'
import { colors, mono, statusOf } from '@/theme'

export type IconName = ComponentProps<typeof Feather>['name']

/** Slides up and fades in when it first appears (the web app's `animate-fade-up`). */
export function FadeUp({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(0))
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 280, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [v, delay])
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      {children}
    </Animated.View>
  )
}

/** Springs in from small (the web app's `animate-pop`), for check marks and verdict icons. */
export function Pop({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(0))
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start()
  }, [v])
  return <Animated.View style={[style, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>{children}</Animated.View>
}

/** A ring that spins: shows a step is in progress. */
export function Spinner({ size = 20, color = colors.accent }: { size?: number; color?: string }) {
  const [v] = useState(() => new Animated.Value(0))
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [v])
  return (
    <Animated.View
      style={{
        width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, borderTopColor: 'transparent',
        transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <View style={s.tag}>
      <Text style={s.tagText}>{children}</Text>
    </View>
  )
}

export function StatusPill({ status, small }: { status?: string | null; small?: boolean }) {
  const st = statusOf(status)
  return (
    <View style={[s.pill, { backgroundColor: st.tint, borderColor: st.hex + '40' }, small && { paddingVertical: 2, paddingHorizontal: 8 }]}>
      <View style={[s.dot, { backgroundColor: st.hex }]} />
      <Text style={{ color: st.text, fontSize: small ? 11 : 12, fontWeight: '600' }}>{st.label}</Text>
    </View>
  )
}

export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#CBD5E1', true: colors.accent }} thumbColor="#fff" />
}

export function Button({
  title, onPress, kind = 'primary', icon, disabled, style,
}: { title: string; onPress: () => void; kind?: 'primary' | 'ghost'; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const primary = kind === 'primary'
  const fg = primary ? '#fff' : colors.ink
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        primary ? { backgroundColor: pressed ? colors.accentHover : colors.accent } : { backgroundColor: pressed ? colors.subtle : '#fff', borderWidth: 1, borderColor: colors.line },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={16} color={fg} />}
      <Text style={{ color: fg, fontSize: 15, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  )
}

export const text = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '600', color: colors.ink, lineHeight: 31 },
  h2: { fontSize: 18, fontWeight: '600', color: colors.ink },
  h3: { fontSize: 14, fontWeight: '600', color: colors.ink },
  body: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  muted: { fontSize: 13, color: colors.ink2, lineHeight: 19 },
  faint: { fontSize: 12, color: colors.ink3 },
  mono: { fontFamily: mono, fontSize: 11, color: colors.ink3 } as TextStyle,
})

const s = StyleSheet.create({
  tag: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontFamily: mono, fontSize: 10.5, color: colors.ink2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, height: 48, paddingHorizontal: 16 },
})
