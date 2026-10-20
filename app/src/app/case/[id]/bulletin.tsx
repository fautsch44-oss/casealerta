// V1 · Boletín de visas — se abre desde A2. Fecha de prioridad vs boletín del mes, avance y aviso cuando sea actual.
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button, Card, Label, ReceiptBadge } from '../../../components/ui';
import { useT } from '../../../i18n';
import { getCase, type CaseRow } from '../../../lib/api';
import { bulletinHistory, CATEGORIES, CATEGORY_LABEL, COUNTRIES, COUNTRY_LABEL, fmtDate, fmtMonth, latestBulletin, saveBulletinPrefs, verdict, type BulletinRow, type Category, type Country } from '../../../lib/bulletin';
import { colors, fonts, radius, semaphore, space, touch } from '../../../theme/tokens';

type CaseWithBulletin = CaseRow & { priority_date?: string | null; preference_category?: string | null; chargeability?: string | null; bulletin_alert?: boolean };

export default function BulletinScreen() {
  const { t, lang } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<CaseWithBulletin | null>(null);
  const [priority, setPriority] = useState('');
  const [cat, setCat] = useState<Category>('F2A');
  const [country, setCountry] = useState<Country>('MX');
  const [alert, setAlert] = useState(true);
  const [latest, setLatest] = useState<BulletinRow | null>(null);
  const [hist, setHist] = useState<BulletinRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadBulletin = useCallback(async (c: Category, k: Country) => {
    const [l, h] = await Promise.all([latestBulletin(c, k).catch(() => null), bulletinHistory(c, k).catch(() => [])]);
    setLatest(l); setHist(h);
  }, []);

  useEffect(() => {
    (async () => {
      const c = (await getCase(String(id)).catch(() => null)) as CaseWithBulletin | null;
      setRow(c);
      if (c?.priority_date) setPriority(c.priority_date);
      const cc = (c?.preference_category as Category) || 'F2A';
      const kk = (c?.chargeability as Country) || 'MX';
      setCat(cc); setCountry(kk); setAlert(c?.bulletin_alert ?? true);
      setEditing(!c?.priority_date);
      await loadBulletin(cc, kk);
    })();
  }, [id, loadBulletin]);

  const validPriority = /^\d{4}-\d{2}-\d{2}$/.test(priority);
  const res = useMemo(() => verdict(latest, validPriority ? priority : null), [latest, priority, validPriority]);
  const sem = res.v === 'current' ? semaphore.approved : res.v === 'unavailable' ? semaphore.action : semaphore.waiting;

  const save = async () => {
    if (!row) return;
    setBusy(true);
    try {
      await saveBulletinPrefs(row.id, { priority_date: validPriority ? priority : null, preference_category: cat, chargeability: country, bulletin_alert: alert });
      await loadBulletin(cat, country);
      setEditing(false);
    } finally { setBusy(false); }
  };

  // barra de avance: posición del corte respecto a la fecha de prioridad (0 = muy lejos, 1 = actual)
  const progress = useMemo(() => {
    if (!validPriority || !latest?.cutoff_date) return res.v === 'current' ? 1 : 0;
    const span = 365 * 3; // ventana de 3 años
    return Math.max(0, Math.min(1, 1 - res.daysBehind / span));
  }, [validPriority, latest, res]);

  const Chip = <T extends string>({ value, label, on, set }: { value: T; label: string; on: boolean; set: (v: T) => void }) => (
    <Pressable accessibilityRole="button" onPress={() => set(value)} style={[styles.chip, on && styles.chipOn]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: on ? colors.onDark : colors.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.back} onPress={() => router.back()} style={styles.round}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.onDark} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.hTitle}>{t.v1_title}</Text>
          {row && <ReceiptBadge receipt={row.receipt_number} prefix={row.label || row.form_type || undefined} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {(editing || !validPriority) ? (
          <Card>
            <Text style={styles.body}>{t.v1_setup}</Text>
            <Label>{t.v1_priority}</Label>
            <TextInput value={priority} onChangeText={setPriority} placeholder="2023-02-15" placeholderTextColor={colors.line} keyboardType="numbers-and-punctuation" style={styles.input} />
            <Label>{t.v1_category}</Label>
            <View style={styles.chips}>{CATEGORIES.map((c) => <Chip key={c} value={c} label={c.replace('_OW', '-OW')} on={cat === c} set={(v) => { setCat(v); loadBulletin(v, country); }} />)}</View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{CATEGORY_LABEL[cat][lang]}</Text>
            <Label>{t.v1_country}</Label>
            <View style={styles.chips}>{COUNTRIES.map((k) => <Chip key={k} value={k} label={COUNTRY_LABEL[k][lang]} on={country === k} set={(v) => { setCountry(v); loadBulletin(cat, v); }} />)}</View>
            <Button title={t.v1_save} onPress={save} loading={busy} disabled={!validPriority} style={{ height: 52, marginTop: 4 }} />
          </Card>
        ) : null}

        {validPriority && !editing && (
          <>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.icon, { backgroundColor: sem.bg }]}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={sem.fg} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    {res.v === 'current' ? <><Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><Path d="M8 12l3 3 5-6" /></> : <><Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><Path d="M12 7v5l3 2" /></>}
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.black, fontSize: 18, color: sem.fg }}>{res.v === 'current' ? t.v1_current : res.v === 'unavailable' ? t.v1_unavailable : t.v1_notYet}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{res.v === 'current' ? t.v1_currentSub : res.v === 'not_yet' ? t.v1_notYetSub(res.daysBehind) : ''}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={styles.stat}><Label>{t.v1_priority}</Label><Text style={styles.statV}>{fmtDate(priority, lang)}</Text></View>
                <View style={styles.stat}><Label>{latest ? t.v1_bulletin(fmtMonth(latest.bulletin_month, lang)) : '—'}</Label><Text style={styles.statV}>{latest ? (latest.status === 'current' ? 'C' : latest.status === 'unavailable' ? 'U' : fmtDate(latest.cutoff_date, lang)) : '—'}</Text></View>
              </View>
              <View style={{ gap: 6 }}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
                  <View style={[styles.knob, { left: `${Math.round(progress * 100)}%` }]} />
                  <View style={styles.goal} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.tiny}>{lang === 'es' ? 'Boletín hoy' : 'Bulletin today'}</Text>
                  <Text style={styles.tiny}>{lang === 'es' ? 'Tu fecha' : 'Your date'}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>{t.v1_chart} · {CATEGORY_LABEL[cat][lang]} · {COUNTRY_LABEL[country][lang]}</Text>
              <Pressable onPress={() => setEditing(true)} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}><Text style={styles.link}>{lang === 'es' ? 'Cambiar datos' : 'Edit details'}</Text></Pressable>
            </Card>

            <Card>
              <Label>{t.v1_meaning}</Label>
              <Text style={styles.body}>{!latest ? t.v1_noData : res.v === 'current' ? t.v1_meaningCurrent : t.v1_meaningBody(latest.cutoff_date ? fmtDate(latest.cutoff_date, lang) : '—', fmtDate(priority, lang))}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>{t.a2_ai}</Text>
            </Card>

            {hist.length > 1 && (
              <Card>
                <Label>{lang === 'es' ? 'CÓMO HA AVANZADO' : 'HOW IT HAS MOVED'}</Label>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 56 }}>
                  {hist.map((h, i) => {
                    const v = h.cutoff_date ? new Date(h.cutoff_date).getTime() : Date.now();
                    const min = Math.min(...hist.map((x) => (x.cutoff_date ? new Date(x.cutoff_date).getTime() : Date.now())));
                    const max = Math.max(...hist.map((x) => (x.cutoff_date ? new Date(x.cutoff_date).getTime() : Date.now())));
                    const pct = max === min ? 0.6 : 0.3 + 0.7 * ((v - min) / (max - min));
                    return <View key={h.bulletin_month} style={{ flex: 1, height: Math.round(56 * pct), borderRadius: 4, backgroundColor: i === hist.length - 1 ? colors.blue : colors.line }} />;
                  })}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {hist.map((h) => <Text key={h.bulletin_month} style={styles.tiny}>{new Date(h.bulletin_month + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short' })}</Text>)}
                </View>
              </Card>
            )}

            <View style={styles.rowCard}>
              <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>{t.v1_alert}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{t.v1_alertSub}</Text></View>
              <Switch value={alert} onValueChange={(v) => { setAlert(v); if (row) saveBulletinPrefs(row.id, { priority_date: priority, preference_category: cat, chargeability: country, bulletin_alert: v }).catch(() => {}); }} trackColor={{ true: colors.green, false: colors.line }} thumbColor={colors.card} />
            </View>
          </>
        )}

        <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html')} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.blue} strokeWidth={2.2} strokeLinecap="round"><Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><Path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></Svg>
          <Text style={styles.link}>{t.v1_official}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.blue, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontFamily: fonts.black, fontSize: 18, color: colors.onDark },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  input: { height: 54, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 16, fontFamily: fonts.black, fontSize: 18, letterSpacing: 1, color: colors.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: 14, padding: 12, gap: 4 },
  statV: { fontFamily: fonts.black, fontSize: 17, color: colors.ink },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.lineSoft, position: 'relative' },
  fill: { position: 'absolute', left: 0, top: 0, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  knob: { position: 'absolute', top: -5, width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: colors.card, borderWidth: 4, borderColor: colors.blue },
  goal: { position: 'absolute', right: 0, top: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.gold },
  tiny: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.blue },
  rowCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
