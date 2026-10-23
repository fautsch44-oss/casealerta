// GRACIAS (skill flujo-onboarding §4): llega sola tras la confirmación de RevenueCat y regresa al origen.
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/Journey';
import { Button, Seal } from '../../components/ui';
import { useT } from '../../i18n';
import { track } from '../../lib/analytics';
import { colors, fonts, radius, space } from '../../theme/tokens';

export default function Thanks() {
  const { t } = useT();
  const { from } = useLocalSearchParams<{ from?: string }>();
  useEffect(() => { track('thanks_viewed', { from: from ?? 'menu' }); }, [from]);
  const go = () => { if (router.canDismiss()) router.dismissAll(); else router.replace('/(tabs)/cases'); };
  return (
    <SafeAreaView style={styles.root}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <View style={styles.ring}><Seal size={110} border={4} /></View>
          <View style={styles.badge}><Icon name="check" size={18} color={colors.onDark} sw={3} /><Text style={styles.badgeTxt}>PRO</Text></View>
        </View>
        <Text style={styles.h1}>{t.th_title}</Text>
        <Text style={styles.sub}>{t.th_sub}</Text>
        <View style={styles.card}>
          {[{ i: 'bell' as const, s: t.th_f1 }, { i: 'shield' as const, s: t.th_f2 }, { i: 'family' as const, s: t.th_f3 }].map((f) => (
            <View key={f.s} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.ic}><Icon name={f.i} size={20} color={colors.blue} sw={2.2} /></View>
              <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>{f.s}</Text>
            </View>
          ))}
        </View>
      </View>
      <Button title={t.th_cta} onPress={go} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy, padding: space.xl },
  ring: { padding: 8, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.green, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 14 },
  badgeTxt: { fontFamily: fonts.black, fontSize: 14, letterSpacing: 2, color: colors.onDark },
  h1: { fontFamily: fonts.black, fontSize: 30, color: colors.onDark, textAlign: 'center' },
  sub: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, color: colors.onDarkMuted, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 14 },
  ic: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6EEFA', alignItems: 'center', justifyContent: 'center' },
});
