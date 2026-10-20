// Festejo al aprobar (A2b): confeti + globos ~3 s, integrado, estilo campanadas de Año Nuevo del Apple Watch.
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useT } from '../i18n';
import { colors, fonts, radius, space } from '../theme/tokens';
import { Button, Check } from './ui';

const { width: W, height: H } = Dimensions.get('window');
const PALETTE = [colors.red, colors.gold, colors.card, colors.blue, colors.green];

function Piece({ i }: { i: number }) {
  const seed = useMemo(() => ({ x: Math.random() * W, delay: Math.random() * 600, dur: 2200 + Math.random() * 1200, rot: Math.random() * 720 - 360, color: PALETTE[i % PALETTE.length], w: 8 + Math.random() * 6, dot: Math.random() < 0.3 }), [i]);
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(seed.delay, withTiming(1, { duration: seed.dur, easing: Easing.out(Easing.quad) })); }, [p, seed]);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: seed.x + Math.sin(p.value * 6) * 18 }, { translateY: -40 + p.value * (H + 80) }, { rotate: `${p.value * seed.rot}deg` }],
    opacity: p.value < 0.85 ? 1 : 1 - (p.value - 0.85) / 0.15,
  }));
  return <Animated.View pointerEvents="none" style={[styles.piece, st, { backgroundColor: seed.color, width: seed.w, height: seed.dot ? seed.w : seed.w * 1.6, borderRadius: seed.dot ? seed.w / 2 : 2 }]} />;
}

function Balloon({ i }: { i: number }) {
  const seed = useMemo(() => ({ x: 30 + (i * 97) % (W - 80), delay: 200 + i * 180, color: PALETTE[(i + 1) % PALETTE.length] }), [i]);
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(seed.delay, withTiming(1, { duration: 3200, easing: Easing.out(Easing.cubic) })); }, [p, seed]);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: seed.x + Math.sin(p.value * 4) * 12 }, { translateY: H + 60 - p.value * (H + 160) }],
    opacity: p.value < 0.8 ? 1 : 1 - (p.value - 0.8) / 0.2,
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.balloon, st]}>
      <View style={{ width: 44, height: 56, borderRadius: 24, backgroundColor: seed.color }} />
      <View style={{ width: 2, height: 36, backgroundColor: colors.onDarkMuted, marginTop: 2 }} />
    </Animated.View>
  );
}

export function Celebration({ label, days, onNext, onDismiss, shareText }:
  { label: string; days: number; onNext: () => void; onDismiss: () => void; shareText: string }) {
  const { t } = useT();
  const fade = useSharedValue(0);
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    fade.value = withTiming(1, { duration: 400 });
  }, [fade]);
  const bg = useAnimatedStyle(() => ({ opacity: fade.value }));
  const rate = async () => {
    try { if (await StoreReview.hasAction()) await StoreReview.requestReview(); } catch { /* la tienda decide */ }
  };
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, bg]}>
      {Array.from({ length: 36 }).map((_, i) => <Piece key={`p${i}`} i={i} />)}
      {Array.from({ length: 4 }).map((_, i) => <Balloon key={`b${i}`} i={i} />)}
      <View style={styles.card}>
        <View style={styles.checkWrap}><Check size={52} /></View>
        <Text style={styles.title}>{t.c_title(label)}</Text>
        <Text style={styles.sub}>{t.c_sub(days)}</Text>
        <View style={{ gap: 10, width: '100%' }}>
          <Button title={t.c_next} variant="navy" onPress={onNext} style={{ height: 54, backgroundColor: colors.blue }} />
          <Button title={t.c_rate} variant="secondary" onPress={rate} style={{ height: 54 }} />
          <Pressable onPress={() => Share.share({ message: shareText })} style={{ padding: 6, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.muted }}>{t.c_share}</Text>
          </Pressable>
          <Pressable onPress={onDismiss} accessibilityRole="button" style={{ padding: 4, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.line }}>{t.ok}</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(10,42,107,0.55)', alignItems: 'center', justifyContent: 'center', padding: space.xl },
  piece: { position: 'absolute', top: 0, left: 0 },
  balloon: { position: 'absolute', top: 0, left: 0, alignItems: 'center' },
  card: { width: '100%', backgroundColor: colors.card, borderRadius: radius.xl, padding: 24, alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 20 }, elevation: 10 },
  checkWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.black, fontSize: 26, lineHeight: 31, color: colors.navy, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.body, textAlign: 'center' },
});
