import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { PAYWALL_SEEN_KEY } from '../index';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { Button, Seal } from '../../components/ui';
import { useT } from '../../i18n';
import { colors, fonts, radius, space, touch } from '../../theme/tokens';

export default function PaywallExample() {
  const { t } = useT();
  useEffect(() => { AsyncStorage.setItem(PAYWALL_SEEN_KEY, '1').catch(() => {}); }, []);
  const close = () => router.replace('/(tabs)/cases');
  const Feat = ({ text }: { text: string }) => (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={styles.tick}><Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.onDark} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 12l5 5 9-10" /></Svg></View>
      <Text style={styles.feat}>{text}</Text>
    </View>
  );
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.cancel} onPress={close} style={styles.close}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.onDark} strokeWidth={2.5} strokeLinecap="round"><Path d="M6 6l12 12M18 6L6 18" /></Svg>
          </Pressable>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={styles.badge}>{t.p1_badge}</Text>
          <Text style={styles.h1}>{t.p1_title}</Text>
          <Text style={styles.sub}>{t.p1_sub}</Text>
        </View>

        <View style={styles.notif}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Seal size={36} border={2} />
            <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.black, fontSize: 13, color: colors.ink }}>CaseAlerta</Text><Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>ahora · now</Text></View>
            <Text style={styles.exTag}>{t.p1_example}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink, flex: 1 }}>{t.p1_exTitle}</Text>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green }} />
          </View>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.body }}>{t.p1_exBody}</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Feat text={t.p1_f1} /><Feat text={t.p1_f2} /><Feat text={t.p1_f3} /><Feat text={t.p1_f4} />
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth={2.5} strokeLinecap="round"><Rect x={4} y={10} width={16} height={11} rx={2} /><Path d="M8 10V7a4 4 0 0 1 8 0v3" /></Svg>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.onDarkMuted }}>{t.p1_trial}</Text>
          </View>
          <Button title={t.p1_cta} onPress={() => router.push('/paywall/plans')} />
          <Pressable onPress={close} style={{ padding: 8, alignItems: 'center' }}><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.onDarkMuted }}>{t.p1_skip}</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: 8, paddingBottom: space.lg, gap: 18 },
  close: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.gold, color: colors.navy, fontFamily: fonts.black, fontSize: 11, letterSpacing: 1, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, overflow: 'hidden' },
  h1: { fontFamily: fonts.black, fontSize: 26, lineHeight: 31, color: colors.onDark },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.onDarkMuted },
  notif: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 10 },
  exTag: { backgroundColor: colors.greenSoft, color: colors.green, fontFamily: fonts.black, fontSize: 11, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  feat: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.onDark, flex: 1 },
});
