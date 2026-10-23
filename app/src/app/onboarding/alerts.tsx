import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button, Card, Dots, Label } from '../../components/ui';
import { useT } from '../../i18n';
import { getCase, getExplanation, linkEmail, saveProfile, savePushToken, type CaseRow, type Explanation } from '../../lib/api';
import { bucketFor } from '../../lib/receipt';
import { colors, fonts, radius, semaphore, space, touch } from '../../theme/tokens';
import { ONBOARDED_KEY } from '../index';
import { track } from '../../lib/analytics';
import { STEP_KEY } from '../../lib/onboarding';

async function registerPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const res = await Notifications.requestPermissionsAsync();
  track('permission_result', { permission: 'notifications', granted: res.status === 'granted', can_ask_again: res.canAskAgain });
  if (res.status !== 'granted') return null;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('case', { name: 'Caso', importance: Notifications.AndroidImportance.HIGH });
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export default function AlertsScreen() {
  const { t, lang } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<CaseRow | null>(null);
  const [ex, setEx] = useState<Explanation | null>(null);
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [addr, setAddr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { AsyncStorage.setItem(STEP_KEY, 'alerts').catch(() => {}); track('onboarding_step_viewed', { step: 'alerts' }); }, []);
  useEffect(() => {
    (async () => {
      const c = await getCase(String(id)).catch(() => null);
      setRow(c);
      if (c) setEx(await getExplanation(c.form_type, c.last_status_text, lang).catch(() => null));
    })();
  }, [id, lang]);

  const go = async () => {
    setBusy(true);
    try {
      await saveProfile({ lang, push_enabled: push, email_enabled: email && !!addr.trim() });
      if (push) {
        const tok = await registerPush().catch(() => null);
        if (tok) await savePushToken(tok, Platform.OS === 'ios' ? 'ios' : 'android').catch(() => {});
      }
      if (email && addr.trim()) await linkEmail(addr.trim()).catch(() => {});
      await AsyncStorage.setItem(ONBOARDED_KEY, '1');
      await AsyncStorage.removeItem(STEP_KEY);
      track('onboarding_completed', { push, email: email && !!addr.trim() });
      // El paywall nunca es la única pantalla: casa primero, paywall encima.
      router.replace('/(tabs)/cases');
      setTimeout(() => router.push({ pathname: '/paywall/example', params: { reason: 'onboarding' } }), 50);
    } finally { setBusy(false); }
  };

  const b = bucketFor(row?.last_status_text);
  const sem = semaphore[b];
  const Row = ({ title, sub, value, onValue, bg, fg, icon }: { title: string; sub: string; value: boolean; onValue: (v: boolean) => void; bg: string; fg: string; icon: React.ReactNode }) => (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: bg }]}>{icon}</View>
      <View style={{ flex: 1 }}><Text style={styles.rowT}>{title}</Text><Text style={styles.rowS}>{sub}</Text></View>
      <Switch value={value} onValueChange={onValue} trackColor={{ true: colors.green, false: colors.line }} thumbColor={colors.card} />
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.back} onPress={() => router.back()} style={styles.back}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
          </Pressable>
          <Text style={styles.stepTxt}>{t.step(3, 3)}</Text>
          <View style={{ width: touch }} />
        </View>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Label>{t.o3_today}</Label>
            <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.muted }}>{row?.form_type ?? ''} · {row?.receipt_number ?? ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: sem.fg }} />
            <Text style={{ fontFamily: fonts.black, fontSize: 18, color: colors.ink, flex: 1 }}>{ex?.status_title ?? row?.last_status_text ?? t.a1_loading}</Text>
          </View>
          {ex ? (
            <Text style={styles.body}><Text style={styles.bodyB}>{t.a2_meaning.charAt(0) + t.a2_meaning.slice(1).toLowerCase()}:</Text> {ex.meaning}{ex.next_steps[0] ? <Text> <Text style={styles.bodyB}>{t.a2_next.charAt(0) + t.a2_next.slice(1).toLowerCase()}:</Text> {ex.next_steps[0]}</Text> : null}</Text>
          ) : row ? <Text style={styles.body}>{t.a2_noExplain}</Text> : null}
          <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>{t.a2_ai}</Text>
        </Card>

        <View style={{ gap: 8 }}>
          <Text style={styles.h1}>{t.o3_title}</Text>
          <Text style={styles.sub}>{t.o3_sub}</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Row title={t.o3_push} sub={t.o3_pushSub} value={push} onValue={setPush} bg={colors.redSoft} fg={colors.red}
            icon={<Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.red} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><Path d="M10 20a2 2 0 0 0 4 0" /></Svg>} />
          <Row title={t.o3_email} sub={t.o3_emailSub} value={email} onValue={setEmail} bg={colors.blueSoft} fg={colors.blue}
            icon={<Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.blue} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Path d="M3 7l9 6 9-6" /></Svg>} />
          {email && (
            <View style={{ gap: 6 }}>
              <Label>{t.o3_emailLabel}</Label>
              <TextInput value={addr} onChangeText={setAddr} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="nombre@correo.com" placeholderTextColor={colors.line} style={styles.input} />
            </View>
          )}
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ gap: 12 }}>
          <Button title={t.o3_cta} onPress={go} loading={busy} />
          <Dots n={3} active={2} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: 10, paddingBottom: space.lg, gap: 18 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  h1: { fontFamily: fonts.black, fontSize: 24, lineHeight: 29, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.body },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.body },
  bodyB: { fontFamily: fonts.bold, color: colors.ink },
  row: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowT: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  rowS: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  input: { height: 54, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 16, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
});
