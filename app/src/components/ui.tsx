import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useT } from '../i18n';
import { colors, fonts, radius, shadow, space, touch } from '../theme/tokens';

export function Seal({ size = 56, border = 3 }: { size?: number; border?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.card, borderWidth: border, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', ...shadow.card }}>
      <Image source={require('../../assets/images/seal.png')} style={{ width: size - border * 2 - 4, height: size - border * 2 - 4 }} contentFit="contain" />
    </View>
  );
}

export function Wordmark({ size = 18, color = colors.onDark }: { size?: number; color?: string }) {
  return <Text style={{ fontFamily: fonts.display, fontSize: size, letterSpacing: size / 9, color }}>CASEALERTA</Text>;
}

/** Marca con subrayado de bandera que mide EXACTAMENTE lo mismo que la palabra (el contenedor se ajusta al texto). */
export function Brand({ size = 18, color = colors.onDark, gap = 4 }: { size?: number; color?: string; gap?: number }) {
  return (
    <View style={{ alignSelf: 'flex-start', gap }}>
      <Wordmark size={size} color={color} />
      <FlagBar width="100%" />
    </View>
  );
}

export function FlagBar({ width = 200 }: { width?: number | '100%' }) {
  return (
    <View style={{ width, height: 8, borderRadius: 2, overflow: 'hidden' }}>
      <View style={{ flex: 3, backgroundColor: colors.red }} />
      <View style={{ flex: 2, backgroundColor: colors.card }} />
      <View style={{ flex: 3, backgroundColor: colors.blue }} />
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, icon }:
  { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'navy'; loading?: boolean; disabled?: boolean; style?: ViewStyle; icon?: React.ReactNode }) {
  const bg = variant === 'primary' ? colors.red : variant === 'navy' ? colors.navy : variant === 'secondary' ? colors.card : 'transparent';
  const fg = variant === 'primary' || variant === 'navy' ? colors.onDark : variant === 'secondary' ? colors.navy : colors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: pressed || disabled ? 0.8 : 1 },
        variant === 'primary' && shadow.cta, variant === 'secondary' && { borderWidth: 2, borderColor: colors.gold }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {icon}
          <Text style={{ fontFamily: fonts.black, fontSize: variant === 'ghost' ? 13 : 17, color: fg }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function CopyIcon({ size = 18, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={9} y={9} width={11} height={11} rx={2} />
      <Path d="M5 15V5h10" />
    </Svg>
  );
}

/** Número de recibo con botón de copiar (regla de Juan, 19 oct 2026: en todos lados). */
export function ReceiptBadge({ receipt, color = colors.onDarkMuted, iconColor = colors.gold, prefix }:
  { receipt: string; color?: string; iconColor?: string; prefix?: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(receipt);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, color }}>{prefix ? `${prefix} · ` : ''}{receipt}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t.a2_copy} onPress={copy} hitSlop={8}
        style={{ width: touch, height: touch, alignItems: 'center', justifyContent: 'center', marginVertical: -12 }}>
        {copied ? <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: iconColor }}>{t.a2_copied}</Text> : <CopyIcon color={iconColor} />}
      </Pressable>
    </View>
  );
}

export function Dots({ n, active }: { n: number; active: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{ width: i === active ? 24 : 6, height: 6, borderRadius: 3, backgroundColor: i === active ? colors.blue : colors.line }} />
      ))}
    </View>
  );
}

export function Check({ color = colors.green, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
      <Path d="M8 12l3 3 5-6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  btn: { height: 58, borderRadius: radius.lg - 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm, ...shadow.card },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.muted },
});
