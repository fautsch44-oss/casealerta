import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { track } from '../../lib/analytics';
import { STEP_KEY } from '../../lib/onboarding';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button, Card, Check, Dots, Label } from '../../components/ui';
import { useT } from '../../i18n';
import { addCase, ApiError, lookupReceipt } from '../../lib/api';
import { centerFor, isValidReceipt, normalizeReceipt } from '../../lib/receipt';
import { colors, fonts, radius, space, touch } from '../../theme/tokens';

export default function ReceiptScreen() {
  const { t, lang } = useT();
  const params = useLocalSearchParams<{ receipt?: string; from?: string }>();
  const [raw, setRaw] = useState(params.receipt ? normalizeReceipt(String(params.receipt)) : '');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errDetail, setErrDetail] = useState<string | null>(null);
  const [canSaveAnyway, setCanSaveAnyway] = useState(false);
  const receipt = normalizeReceipt(raw);
  const valid = isValidReceipt(receipt);
  const center = useMemo(() => centerFor(receipt, lang), [receipt, lang]);
  const fromTabs = params.from === 'tabs';
  React.useEffect(() => { if (!fromTabs) AsyncStorage.setItem(STEP_KEY, 'receipt').catch(() => {}); track('onboarding_step_viewed', { step: 'receipt', from: fromTabs ? 'tabs' : 'onboarding' }); }, [fromTabs]);

  const next = (id: string) => {
    if (fromTabs) router.replace({ pathname: '/case/[id]', params: { id } });
    else router.push({ pathname: '/onboarding/alerts', params: { id } });
  };

  const go = async () => {
    setBusy(true); setErr(null); setErrDetail(null); setCanSaveAnyway(false);
    try {
      const status = await lookupReceipt(receipt);
      const row = await addCase(status, label.trim() || null);
      track('first_value_shown', { form: status.form_type ?? 'unknown', has_status: !!(status.status_en ?? status.status_es) });
      next(row.id);
    } catch (e: any) {
      track('error_shown', { where: 'receipt_lookup', code: e?.code ?? String(e?.status ?? 'unknown') });
      if (e instanceof ApiError && e.detail) setErrDetail(e.detail);
      if (e instanceof ApiError && (e.status === 404 || e.code === 'invalid_receipt')) setErr(t.o2_notFound);
      else { setErr((e instanceof ApiError && e.status >= 400 && (lang === 'es' ? e.messageEs : e.message)) || t.o2_error); setCanSaveAnyway(true); }
    } finally { setBusy(false); }
  };

  // USCIS no respondió: guardamos el recibo sin estatus y el cron lo consulta después. Nadie se queda atorado aquí.
  const saveAnyway = async () => {
    setBusy(true); setErr(null);
    try {
      const row = await addCase({ receipt_number: receipt, form_type: null, status_en: null, status_es: null, desc_en: null, desc_es: null, submitted: null, modified: null, history: [] }, label.trim() || null);
      next(row.id);
    } catch { setErr(t.o2_error); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Pressable accessibilityRole="button" accessibilityLabel={t.back} onPress={() => router.back()} style={styles.back}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
            </Pressable>
            <Text style={styles.stepTxt}>{fromTabs ? '' : t.step(2, 3)}</Text>
            <View style={{ width: touch }} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.h1}>{t.o2_title}</Text>
            <Text style={styles.sub}>{t.o2_sub}</Text>
          </View>

          <View style={{ gap: 8 }}>
            <Label>{t.o2_label}</Label>
            <TextInput value={raw} onChangeText={(v) => { setRaw(v.toUpperCase()); setErr(null); }} autoCapitalize="characters" autoCorrect={false}
              maxLength={13} placeholder="SRC2390105090" placeholderTextColor={colors.line}
              style={[styles.input, { borderColor: raw.length ? (valid ? colors.blue : colors.red) : colors.line }]} />
          </View>

          {receipt.length > 0 && (
            <View style={[styles.hint, { backgroundColor: valid ? colors.greenSoft : colors.redSoft }]}>
              {valid ? <Check /> : <View style={{ width: 20 }} />}
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: valid ? colors.green : colors.red, flex: 1 }}>
                {valid ? t.o2_ok(center) : t.o2_bad}
              </Text>
            </View>
          )}

          <Card style={{ gap: 10 }}>
            <Label>{t.o2_where}</Label>
            <View style={styles.notice}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.ink }}>{t.o2_notice}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>Receipt Number: <Text style={{ backgroundColor: colors.goldSoft, color: colors.amber, fontFamily: fonts.black }}>SRC2390105090</Text></Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>Notice Date · Case Type · Priority Date</Text>
            </View>
          </Card>

          <View style={{ gap: 8 }}>
            <Label>{t.o2_nameLabel}</Label>
            <TextInput value={label} onChangeText={setLabel} placeholder={t.o2_namePh} placeholderTextColor={colors.line} style={styles.inputSm} />
          </View>

          {err && <Text style={styles.err}>{err}</Text>}
          {err && errDetail && <Text style={styles.errDetail} numberOfLines={3}>USCIS: {errDetail}</Text>}
          <View style={{ flex: 1 }} />
          <View style={{ gap: 12 }}>
            <Button title={busy ? t.o2_checking : t.o2_cta} onPress={go} loading={busy} disabled={!valid} />
            {canSaveAnyway && valid && (
              <Pressable accessibilityRole="button" onPress={saveAnyway} disabled={busy} style={{ padding: 8, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.blue }}>{t.o2_saveAnyway}</Text>
              </Pressable>
            )}
            <Text style={styles.note}>{t.o2_note}</Text>
            {!fromTabs && <Dots n={3} active={1} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: 10, paddingBottom: space.lg, gap: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  h1: { fontFamily: fonts.black, fontSize: 26, lineHeight: 31, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.body },
  input: { height: 64, borderRadius: radius.md + 2, borderWidth: 3, backgroundColor: colors.card, paddingHorizontal: 18, fontFamily: fonts.black, fontSize: 24, letterSpacing: 2, color: colors.navy },
  inputSm: { height: 54, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 16, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  hint: { borderRadius: radius.md, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  notice: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 12, padding: 12, gap: 6 },
  err: { fontFamily: fonts.bold, fontSize: 14, color: colors.red, textAlign: 'center' },
  errDetail: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted, textAlign: 'center' },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
