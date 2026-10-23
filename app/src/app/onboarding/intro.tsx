// INTRO DE VALOR (skill flujo-onboarding §4): 3 láminas antes de pedir cualquier dato.
// 1) qué es · 2) cómo te ayuda (demo visual) · 3) qué ganas (dato duro con fuente + beneficios).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bubble, Icon, Stepper, journeyFor } from '../../components/Journey';
import { Button, FlagBar, Seal, Wordmark } from '../../components/ui';
import { useT } from '../../i18n';
import { track } from '../../lib/analytics';
import { ROUTE, STEP_KEY, skipTarget } from '../../lib/onboarding';
import { colors, fonts, radius, space } from '../../theme/tokens';

export default function IntroScreen() {
  const { t, lang } = useT();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 720);
  const [i, setI] = useState(0);
  const ref = useRef<any>(null);
  const es = lang === 'es';

  useEffect(() => { AsyncStorage.setItem(STEP_KEY, 'intro').catch(() => {}); }, []);
  useEffect(() => { track('onboarding_step_viewed', { step: `intro_${i + 1}` }); }, [i]);

  const goTo = (n: number) => { ref.current?.scrollTo({ x: n * w, animated: true }); setI(n); };
  const leave = (skipped: boolean) => {
    track(skipped ? 'onboarding_skipped' : 'onboarding_intro_done', { from: `intro_${i + 1}` });
    router.push(ROUTE[skipTarget('intro')] as any);
  };
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setI(Math.round(e.nativeEvent.contentOffset.x / w));
  const j = journeyFor('Case Is Being Actively Reviewed By USCIS', 'I-485', lang);

  const Slide = ({ children }: { children: React.ReactNode }) => <View style={{ width: w, paddingHorizontal: space.xl, gap: 22, justifyContent: 'center' }}>{children}</View>;
  const Tag = ({ text }: { text: string }) => <Text style={styles.tag}>{text}</Text>;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Seal size={34} border={2} /><Wordmark size={15} /></View>
        <Pressable accessibilityRole="button" onPress={() => leave(true)} style={{ padding: 10 }}><Text style={styles.skip}>{t.ob_skip}</Text></Pressable>
      </View>

      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onEnd} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'stretch' }}>
        <Slide>
          <View style={{ alignItems: 'center', gap: 18 }}>
            <Seal size={132} border={5} />
            <FlagBar width={180} />
          </View>
          <View style={styles.notif}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.bell}><Icon name="bell" size={20} color={colors.onDark} sw={2.4} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.black, fontSize: 13, color: colors.ink }}>CaseAlerta</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }} numberOfLines={2}>{es ? 'Tu I-485 cambió: Caso aprobado' : 'Your I-485 changed: Case approved'}</Text>
              </View>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green }} />
            </View>
          </View>
          <Tag text={t.i1_tag} />
          <Text style={styles.h1}>{t.i1_title}</Text>
          <Text style={styles.sub}>{t.i1_sub}</Text>
        </Slide>

        <Slide>
          <View style={styles.demo}><Stepper j={j} /></View>
          <View style={{ flexDirection: 'row' }}>
            <Bubble label={es ? 'Te lo explico' : 'Let me explain'} text={es ? 'Un oficial está revisando tu expediente. Es normal. Por ahora no tienes que hacer nada.' : 'An officer is reviewing your file. It is normal. Nothing to do for now.'} />
          </View>
          <Tag text={t.i2_tag} />
          <Text style={styles.h1}>{t.i2_title}</Text>
          <Text style={styles.sub}>{t.i2_sub}</Text>
        </Slide>

        <Slide>
          <View style={styles.statBox}>
            <Text style={styles.stat}>{t.i3_stat}</Text>
            <Text style={styles.statSub}>{t.i3_statSub}</Text>
            <Text style={styles.src}>{t.i3_src}</Text>
          </View>
          <Tag text={t.i3_tag} />
          <View style={{ gap: 12 }}>
            {[t.i3_b1, t.i3_b2, t.i3_b3].map((b) => (
              <View key={b} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={styles.tick}><Icon name="check" size={16} color={colors.onDark} sw={3} /></View>
                <Text style={styles.benefit}>{b}</Text>
              </View>
            ))}
          </View>
        </Slide>
      </ScrollView>

      <View style={styles.foot}>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {[0, 1, 2].map((n) => <View key={n} style={[styles.dot, n === i && styles.dotOn]} />)}
        </View>
        <Button title={i < 2 ? t.ob_next : t.ob_start} onPress={() => (i < 2 ? goTo(i + 1) : leave(false))} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: 6 },
  skip: { fontFamily: fonts.bold, fontSize: 14, color: colors.onDarkMuted },
  tag: { alignSelf: 'flex-start', backgroundColor: colors.gold, color: colors.navy, fontFamily: fonts.black, fontSize: 11, letterSpacing: 1, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, overflow: 'hidden' },
  h1: { fontFamily: fonts.black, fontSize: 28, lineHeight: 33, color: colors.onDark },
  sub: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, color: colors.onDarkMuted },
  notif: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14 },
  bell: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  demo: { backgroundColor: colors.blue, borderRadius: 24, paddingVertical: 18, paddingHorizontal: 10 },
  statBox: { backgroundColor: colors.card, borderRadius: 24, padding: 20, gap: 6, alignItems: 'center' },
  stat: { fontFamily: fonts.black, fontSize: 44, color: colors.red },
  statSub: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.ink, textAlign: 'center' },
  src: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted, textAlign: 'center' },
  tick: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  benefit: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.onDark },
  foot: { paddingHorizontal: space.xl, paddingBottom: space.lg, gap: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotOn: { width: 26, backgroundColor: colors.gold },
});
