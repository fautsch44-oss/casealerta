import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { HuespedBubble, HuespedSheet } from '../../components/Huesped';
import { Button, FlagBar, Seal, Wordmark } from '../../components/ui';
import { useT } from '../../i18n';
import { listCases, type CaseRow } from '../../lib/api';
import { bucketFor, checkedLabel, daysSince } from '../../lib/receipt';
import { colors, fonts, radius, semaphore, shadow, space, touch } from '../../theme/tokens';

export default function CasesScreen() {
  const { t, lang, setLang } = useT();
  const [rows, setRows] = useState<CaseRow[] | null>(null);
  const [err, setErr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [guest, setGuest] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await listCases()); setErr(false); } catch { setErr(true); if (!rows) setRows([]); }
  }, [rows]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const counts = { action: 0, waiting: 0, approved: 0 };
  (rows ?? []).forEach((r) => { const b = bucketFor(r.last_status_text); if (b in counts) (counts as any)[b]++; });

  const Stat = ({ n, label, k }: { n: number; label: string; k: 'action' | 'waiting' | 'approved' }) => (
    <View style={styles.stat}><Text style={{ fontFamily: fonts.black, fontSize: 24, color: semaphore[k].fg }}>{n}</Text><Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.ink }}>{label}</Text></View>
  );

  const renderItem = ({ item }: { item: CaseRow }) => {
    const b = bucketFor(item.last_status_text);
    const s = semaphore[b];
    return (
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/case/[id]', params: { id: item.id } })} style={styles.card}>
        <View style={[styles.bar, { backgroundColor: s.fg }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.label || item.receipt_number}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.muted }}>{item.form_type ?? ''}</Text>
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }} numberOfLines={2}>{item.last_status_text ?? t.statusBucket.neutral}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.pill, { color: s.fg, backgroundColor: s.bg }]}>{t.statusBucket[b]}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>{t.a1_lastChange(daysSince(item.last_changed_at ?? item.created_at))}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: daysSince(item.last_checked_at) <= 1 ? colors.green : colors.line }} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: daysSince(item.last_checked_at) <= 1 ? colors.green : colors.muted }}>{checkedLabel(item.last_checked_at, lang)}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Seal size={56} />
            <View style={{ gap: 4 }}><Wordmark size={18} /><FlagBar width={120} /></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t.a3_lang} onPress={() => setLang(lang === 'es' ? 'en' : 'es')} style={styles.round}>
            <Text style={{ fontFamily: fonts.black, fontSize: 13, color: colors.onDark }}>{lang.toUpperCase()}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat n={counts.action} label={t.a1_act} k="action" /><Stat n={counts.waiting} label={t.a1_wait} k="waiting" /><Stat n={counts.approved} label={t.a1_done} k="approved" />
        </View>
      </View>

      <FlatList
        data={rows ?? []}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: space.lg, gap: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
        ListFooterComponent={rows && rows.length ? <HuespedBubble cases={rows} onPress={() => setGuest(true)} /> : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink, textAlign: 'center' }}>{rows === null ? t.a1_loading : err ? t.a1_error : t.a1_empty}</Text>
            {rows !== null && !err && <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' }}>{t.a1_emptySub}</Text>}
            {err && <Button title={t.retry} variant="secondary" onPress={load} style={{ height: 48 }} />}
          </View>
        }
      />

      <HuespedSheet visible={guest} onClose={() => setGuest(false)} focus={(rows ?? []).find((r) => bucketFor(r.last_status_text) === 'action') ?? rows?.[0] ?? null} />

      <Pressable accessibilityRole="button" accessibilityLabel={t.a1_add} onPress={() => router.push({ pathname: '/onboarding/receipt', params: { from: 'tabs' } })} style={styles.fab}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.onDark} strokeWidth={3} strokeLinecap="round"><Path d="M12 5v14M5 12h14" /></Svg>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.blue, padding: 18, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 16 },
  round: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 12, alignItems: 'center', gap: 2 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, flexDirection: 'row', gap: 12, ...shadow.card },
  bar: { width: 6, borderRadius: 3 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, flex: 1, marginRight: 8 },
  pill: { fontFamily: fonts.bold, fontSize: 12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, overflow: 'hidden' },
  empty: { padding: 32, gap: 10, alignItems: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 62, height: 62, borderRadius: 31, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', ...shadow.cta },
});
