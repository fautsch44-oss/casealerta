// A2 · Fechas clave visibles para el cliente (lo que Case Tracker enseña, con nuestro formato).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useT } from '../i18n';
import type { CaseRow } from '../lib/api';
import { checkedLabel, daysSince } from '../lib/receipt';
import { colors, fonts } from '../theme/tokens';
import { Card, Label } from './ui';

export function fmtDate(iso: string | null | undefined, lang: 'es' | 'en') {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CaseDates({ row }: { row: CaseRow }) {
  const { t, lang } = useT();
  const daysIn = daysSince(row.last_changed_at ?? row.created_at);
  const rows: [string, string | null, boolean?][] = [
    [t.d_received, fmtDate(row.received_date, lang)],
    [t.d_priority, fmtDate(row.priority_date, lang)],
    [t.d_lastChange, fmtDate(row.last_changed_at ?? row.last_status_date, lang)],
    [t.d_daysIn, t.d_days(daysIn), true],
    [t.d_added, fmtDate(row.created_at, lang)],
    [t.d_checked, checkedLabel(row.last_checked_at, lang).split(' · ')[0]],
  ];
  return (
    <Card>
      <Label>{t.d_title}</Label>
      {rows.map(([k, v, strong], i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.k}>{k}</Text>
          <Text style={[styles.v, strong && { color: colors.blue }]}>{v ?? t.d_none}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  k: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, flex: 1 },
  v: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
