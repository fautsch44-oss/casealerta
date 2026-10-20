import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Celebration } from '../../../components/Celebration';
import { HuespedSheet } from '../../../components/Huesped';
import { CaseDates, fmtDate } from '../../../components/CaseDates';
import { NvcCard } from '../../../components/NvcCard';
import { Button, Card, Label, ReceiptBadge } from '../../../components/ui';
import { useT } from '../../../i18n';
import { addCase, getCase, getExplanation, listEvents, lookupReceipt, type CaseEvent, type CaseRow, type Explanation } from '../../../lib/api';
import { bucketFor, checkedLabel, daysSince, uscisDate, uscisUrl } from '../../../lib/receipt';
import { supabase } from '../../../lib/supabase';
import { colors, fonts, radius, semaphore, space, touch } from '../../../theme/tokens';

const CELEBRATED = (id: string, status: string) => `casealerta.celebrated.${id}.${status}`;

export default function CaseDetail() {
  const { t, lang } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<CaseRow | null>(null);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [ex, setEx] = useState<Explanation | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [party, setParty] = useState(false);
  const [guest, setGuest] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await getCase(String(id));
      setRow(c); setErr(false);
      if (!c) return;
      const [ev, e] = await Promise.all([listEvents(c.id).catch(() => []), getExplanation(c.form_type, c.last_status_text, lang).catch(() => null)]);
      setEvents(ev); setEx(e);
      if (bucketFor(c.last_status_text) === 'approved' && c.last_status_text) {
        const key = CELEBRATED(c.id, c.last_status_text);
        if (!(await AsyncStorage.getItem(key))) { setParty(true); await AsyncStorage.setItem(key, '1'); }
      }
    } catch { setErr(true); }
  }, [id, lang]);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    if (!row) return;
    setBusy(true);
    try {
      const s = await lookupReceipt(row.receipt_number);
      const text = s.status_en ?? s.status_es;
      if (text && text !== row.last_status_text) {
        const { data: session } = await supabase.auth.getSession();
        await supabase.from('case_events').insert({ case_id: row.id, owner_id: session.session?.user.id, status_code: text, status_text: text, status_date: uscisDate(s.modified), source: 'manual' });
        await supabase.from('cases').update({ last_status_code: text, last_status_text: text, last_checked_at: new Date().toISOString(), last_changed_at: new Date().toISOString(), last_status_date: uscisDate(s.modified), form_type: row.form_type ?? s.form_type, received_date: row.received_date ?? uscisDate(s.submitted) }).eq('id', row.id);
        await AsyncStorage.removeItem(CELEBRATED(row.id, text));
      } else {
        await supabase.from('cases').update({ last_checked_at: new Date().toISOString(), received_date: row.received_date ?? uscisDate(s.submitted), form_type: row.form_type ?? s.form_type }).eq('id', row.id);
      }
      await load();
    } catch { /* se mantiene lo guardado */ } finally { setBusy(false); }
  };

  const b = bucketFor(row?.last_status_text);
  const sem = semaphore[b];
  const label = row?.label || row?.form_type || row?.receipt_number || '';
  const days = daysSince(row?.created_at);
  const shareText = `${label}: ${ex?.status_title ?? row?.last_status_text ?? ''} — CaseAlerta`;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.back} onPress={() => router.back()} style={styles.round}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.onDark} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.hTitle} numberOfLines={1}>{label}</Text>
          {row && <ReceiptBadge receipt={row.receipt_number} prefix={row.form_type ?? undefined} />}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t.a2_refresh} onPress={refresh} disabled={busy} style={[styles.round, busy && { opacity: 0.5 }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.onDark} strokeWidth={2.4} strokeLinecap="round"><Path d="M20 12a8 8 0 1 1-2.3-5.7" /><Path d="M20 4v5h-5" /></Svg>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12, paddingBottom: 40 }}>
        {!row && !err && <Text style={styles.muted}>{t.a1_loading}</Text>}
        {err && <View style={{ gap: 10 }}><Text style={styles.muted}>{t.a1_error}</Text><Button title={t.retry} variant="secondary" onPress={load} style={{ height: 48 }} /></View>}
        {row && (
          <>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: sem.fg }} />
                <Text style={{ fontFamily: fonts.black, fontSize: 20, color: sem.fg, flex: 1 }}>{ex?.status_title ?? row.last_status_text ?? t.statusBucket.neutral}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: daysSince(row.last_checked_at) <= 1 ? colors.greenSoft : colors.bg, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: daysSince(row.last_checked_at) <= 1 ? colors.green : colors.line }} />
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: daysSince(row.last_checked_at) <= 1 ? colors.green : colors.muted, flex: 1 }}>{checkedLabel(row.last_checked_at, lang)}</Text>
              </View>
              <Label>{t.a2_official}{row.last_status_date ? ` · ${row.last_status_date}` : ''}</Label>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>{row.last_status_text ?? '—'}</Text>
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(uscisUrl())} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 6 }}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.blue} strokeWidth={2.2} strokeLinecap="round"><Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><Path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></Svg>
                <Text style={styles.link}>{t.a2_viewOnline}</Text>
              </Pressable>
            </Card>

            <Card>
              <Label>{t.a2_meaning}</Label>
              <Text style={styles.body}>{ex?.meaning ?? t.a2_noExplain}</Text>
              {ex && ex.next_steps.length > 0 && (
                <>
                  <Label>{t.a2_next}</Label>
                  {ex.next_steps.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={styles.num}><Text style={{ fontFamily: fonts.black, fontSize: 12, color: colors.onDark }}>{i + 1}</Text></View>
                      <Text style={[styles.body, { flex: 1 }]}>{s}</Text>
                    </View>
                  ))}
                </>
              )}
              {ex?.typical_days_min != null && ex?.typical_days_max != null && (
                <><Label>{t.a2_typical}</Label><Text style={styles.body}>{t.a2_typicalDays(ex.typical_days_min, ex.typical_days_max)}</Text></>
              )}
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>{t.a2_ai}</Text>
            </Card>

            <CaseDates row={row} />

            <NvcCard row={row} onSaved={load} />

            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Label>{t.a2_history}</Label>
                <Pressable accessibilityRole="button" onPress={() => Share.share({ message: shareText })} style={{ paddingVertical: 6 }}><Text style={styles.link}>{t.a2_share}</Text></Pressable>
              </View>
              {events.length === 0 && <Text style={styles.muted}>—</Text>}
              {events.map((e) => (
                <View key={e.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: semaphore[bucketFor(e.status_text)].fg }} />
                  <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink, flex: 1 }}>{e.status_text?.startsWith('NVC: ') ? `NVC · ${t.nvc_status[e.status_text.slice(5)] ?? e.status_text.slice(5)}` : e.status_text}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{fmtDate(e.status_date ?? e.detected_at, lang)}</Text>
                </View>
              ))}
            </Card>

            <Pressable accessibilityRole="button" onPress={() => setGuest(true)} style={[styles.lawyer, { backgroundColor: colors.blue, borderColor: colors.blue, flexDirection: 'row', gap: 10, justifyContent: 'center' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.onDark} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M4 5h16v11H9l-5 4z" /></Svg>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.onDark }}>{t.h_ask}</Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/case/[id]/bulletin', params: { id: row.id } })} style={[styles.lawyer, { borderColor: colors.gold, flexDirection: 'row', gap: 10, justifyContent: 'center' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M4 5h16v14H4z" /><Path d="M4 10h16M9 5v14" /></Svg>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{t.a2_bulletin}</Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={() => Linking.openURL('https://casealerta.com/abogados')} style={styles.lawyer}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.blue }}>{t.a2_lawyer}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <HuespedSheet visible={guest} onClose={() => setGuest(false)} focus={row} />

      {party && row && (
        <Celebration label={label} days={days} shareText={shareText} onNext={() => setParty(false)} onDismiss={() => setParty(false)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.blue, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontFamily: fonts.black, fontSize: 18, color: colors.onDark },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.blue },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  lawyer: { borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, padding: 14, alignItems: 'center', backgroundColor: colors.card },
});
