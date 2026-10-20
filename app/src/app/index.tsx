// Splash C · Estrella (elegido por Juan, 19 oct 2026). Carga < 1 s y decide a dónde ir.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { FlagBar, Seal, Wordmark } from '../components/ui';
import { useT } from '../i18n';
import { listCases } from '../lib/api';
import { colors, fonts } from '../theme/tokens';

export const ONBOARDED_KEY = 'casealerta.onboarded';
const { width: W, height: H } = Dimensions.get('window');

function Waves() {
  const k = W / 390;
  const band = (y: number, h: number, fill: string, opacity = 1) =>
    <Path key={`${y}-${fill}`} d={`M-40 ${y} C 100 ${y - 40}, 290 ${y + 70}, 430 ${y} L 430 ${y + h} C 290 ${y + h + 70}, 100 ${y + h - 40}, -40 ${y + h} Z`} fill={fill} opacity={opacity} />;
  return (
    <Svg width={W} height={H} viewBox={`0 0 390 ${H / k}`} style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      {band(330, 26, colors.red)}
      {band(372, 18, colors.card, 0.9)}
      {band(404, 26, colors.red)}
      {band(446, 18, colors.card, 0.9)}
      {band(478, 26, colors.red)}
      {band(520, 18, colors.blue)}
      <G fill={colors.gold}>
        <Path d="M195 150 l7 14 15 2 -11 10 3 15 -14 -7 -14 7 3 -15 -11 -10 15 -2z" />
        <Path d="M130 180 l4 8 9 1 -6 6 1 9 -8 -4 -8 4 1 -9 -6 -6 9 -1z" />
        <Path d="M260 180 l4 8 9 1 -6 6 1 9 -8 -4 -8 4 1 -9 -6 -6 9 -1z" />
        <Path d="M80 225 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" />
        <Path d="M310 225 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" />
      </G>
    </Svg>
  );
}

export default function Splash() {
  const { t, ready } = useT();
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    (async () => {
      const started = Date.now();
      let target = '/onboarding/language';
      try {
        const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (onboarded) {
          const cases = await listCases().catch(() => []);
          target = cases.length ? '/(tabs)/cases' : '/onboarding/receipt';
        }
      } catch { /* sin red: onboarding */ }
      const wait = Math.max(0, 900 - (Date.now() - started));
      setTimeout(() => { if (alive) router.replace(target as any); }, wait);
    })();
    return () => { alive = false; };
  }, [ready]);

  return (
    <View style={styles.root}>
      <Waves />
      <View style={styles.center}>
        <View style={styles.sealRing}><Seal size={176} border={6} /></View>
        <View style={styles.textBox}>
          <Wordmark size={36} />
          <Text style={styles.es}>{t.tagline.toUpperCase()}</Text>
          <FlagBar width={200} />
        </View>
      </View>
      <View style={styles.foot}>
        <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: colors.gold }} />
        <Text style={styles.footText}>{t.noAds.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 26, marginTop: 60 },
  sealRing: { borderRadius: 100, padding: 10, backgroundColor: 'rgba(10,42,107,0.9)' },
  textBox: { alignItems: 'center', gap: 8, backgroundColor: 'rgba(10,42,107,0.92)', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 20 },
  es: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.5, color: colors.gold, textAlign: 'center' },
  foot: { position: 'absolute', bottom: 40, alignItems: 'center', gap: 10 },
  footText: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1, color: colors.onDarkMuted },
});
