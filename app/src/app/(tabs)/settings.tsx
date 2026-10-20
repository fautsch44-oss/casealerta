import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Label } from '../../components/ui';
import { useT } from '../../i18n';
import { hasProEntitlement, saveProfile } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, space } from '../../theme/tokens';
import { ONBOARDED_KEY } from '../index';

export default function SettingsScreen() {
  const { t, lang, setLang } = useT();
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [pro, setPro] = useState<boolean | null>(null);

  useFocusEffect(useCallback(() => {
    hasProEntitlement().then(setPro).catch(() => setPro(false));
    supabase.from('profiles').select('push_enabled, email_enabled').maybeSingle().then(({ data }) => {
      if (data) { setPush(!!data.push_enabled); setEmail(!!data.email_enabled); }
    });
  }, []));

  const toggle = async (k: 'push_enabled' | 'email_enabled', v: boolean) => {
    if (k === 'push_enabled') setPush(v); else setEmail(v);
    await saveProfile({ [k]: v }).catch(() => {});
  };
  const changeLang = async (l: 'es' | 'en') => { await setLang(l); await saveProfile({ lang: l }).catch(() => {}); };
  const erase = () => Alert.alert(t.a3_signout, '', [
    { text: t.cancel, style: 'cancel' },
    { text: t.ok, style: 'destructive', onPress: async () => { await supabase.auth.signOut(); await AsyncStorage.removeItem(ONBOARDED_KEY); router.replace('/'); } },
  ]);

  const Row = ({ title, sub, right }: { title: string; sub?: string; right: React.ReactNode }) => (
    <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowT}>{title}</Text>{sub && <Text style={styles.rowS}>{sub}</Text>}</View>{right}</View>
  );
  const Seg = ({ v, label }: { v: 'es' | 'en'; label: string }) => (
    <Pressable accessibilityRole="button" onPress={() => changeLang(v)} style={[styles.seg, lang === v && styles.segOn]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: lang === v ? colors.onDark : colors.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.h1}>{t.a3_title}</Text>
        <Card>
          <Label>{t.a3_lang}</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}><Seg v="es" label="Español" /><Seg v="en" label="English" /></View>
        </Card>
        <Card>
          <Label>{t.a3_channels}</Label>
          <Row title={t.o3_push} sub={t.o3_pushSub} right={<Switch value={push} onValueChange={(v) => toggle('push_enabled', v)} trackColor={{ true: colors.green, false: colors.line }} thumbColor={colors.card} />} />
          <Row title={t.o3_email} sub={t.o3_emailSub} right={<Switch value={email} onValueChange={(v) => toggle('email_enabled', v)} trackColor={{ true: colors.green, false: colors.line }} thumbColor={colors.card} />} />
        </Card>
        <Card>
          <Label>{t.a3_plan}</Label>
          <Row title={pro === null ? '…' : pro ? t.a3_planPro : t.a3_planFree}
            right={<Pressable accessibilityRole="button" onPress={() => (pro ? Linking.openSettings() : router.push('/paywall/example'))} style={styles.linkBtn}><Text style={styles.linkTxt}>{pro ? t.a3_manage : t.p1_cta}</Text></Pressable>} />
        </Card>
        <Card>
          <Label>{t.a3_privacy}</Label>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{t.a3_privacyBody}</Text>
          <Pressable onPress={() => Linking.openURL('https://casealerta.com/privacidad')}><Text style={styles.linkTxt}>{t.p2_privacy}</Text></Pressable>
        </Card>
        <Card>
          <Row title={t.a3_support} right={<Pressable onPress={() => Linking.openURL('mailto:sales@vargersoft.com?subject=CaseAlerta')}><Text style={styles.linkTxt}>sales@vargersoft.com</Text></Pressable>} />
          <Row title={t.a3_version} right={<Text style={{ fontFamily: fonts.bold, color: colors.muted }}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>} />
        </Card>
        <Pressable onPress={erase} style={{ alignItems: 'center', padding: 12 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.red }}>{t.a3_signout}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  h1: { fontFamily: fonts.black, fontSize: 26, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rowT: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  rowS: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  seg: { flex: 1, height: 44, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  linkBtn: { paddingVertical: 8 },
  linkTxt: { fontFamily: fonts.bold, fontSize: 13, color: colors.blue },
});
