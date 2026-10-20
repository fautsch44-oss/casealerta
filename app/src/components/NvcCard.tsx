// A2 · Seguimiento NVC/consulado dentro del mismo caso. CEAC no tiene API y no se hace scraping:
// el usuario anota el paso oficial que ve en CEAC; CaseAlerta guarda fechas, historia y explica qué sigue.
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useT } from '../i18n';
import { NVC_STATUSES, saveNvc, type CaseRow, type NvcStatus } from '../lib/api';
import { colors, fonts, radius } from '../theme/tokens';
import { fmtDate } from './CaseDates';
import { Button, Card, Label } from './ui';

export const CEAC_URL = 'https://ceac.state.gov/CEACStatTracker/Status.aspx';
const NVC_RE = /^[A-Z]{3}[0-9]{10}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DONE: NvcStatus[] = ['visa_issued'];

export function NvcCard({ row, onSaved }: { row: CaseRow; onSaved: () => void }) {
  const { t, lang } = useT();
  const [editing, setEditing] = useState(false);
  const [num, setNum] = useState(row.nvc_case_number ?? '');
  const [inv, setInv] = useState(row.nvc_invoice_id ?? '');
  const [st, setSt] = useState<NvcStatus>(row.nvc_status ?? 'at_nvc');
  const [date, setDate] = useState(row.nvc_status_date ?? new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const clean = num.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const validNum = NVC_RE.test(clean);
  const validDate = date === '' || DATE_RE.test(date);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await saveNvc(row.id, { nvc_case_number: clean, nvc_invoice_id: inv.trim() || null, nvc_status: st, nvc_status_date: date || null });
      setEditing(false); setMsg(t.nvc_updated); onSaved();
    } catch { setMsg(t.a1_error); }
    finally { setBusy(false); }
  };
  const copy = async () => { await Clipboard.setStringAsync(row.nvc_case_number ?? clean); setMsg(t.nvc_copied); };

  const idx = row.nvc_status ? NVC_STATUSES.indexOf(row.nvc_status) : -1;

  if (!row.nvc_case_number && !editing) {
    return (
      <Card>
        <Label>{t.nvc_title}</Label>
        <Text style={styles.body}>{t.nvc_intro}</Text>
        <Button title={t.nvc_add} variant="secondary" onPress={() => setEditing(true)} style={{ height: 48 }} />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <Label>{t.nvc_title}</Label>
        <Text style={styles.small}>{t.nvc_how}</Text>
        <Label>{t.nvc_caseLabel}</Label>
        <TextInput value={num} onChangeText={(v) => setNum(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={13}
          placeholder={t.nvc_casePh} placeholderTextColor={colors.line} style={[styles.input, { borderColor: num ? (validNum ? colors.blue : colors.red) : colors.line }]} />
        {num.length > 0 && !validNum && <Text style={styles.err}>{t.nvc_caseBad}</Text>}
        <Label>{t.nvc_invoiceLabel}</Label>
        <TextInput value={inv} onChangeText={setInv} autoCapitalize="characters" autoCorrect={false} placeholder={t.nvc_invoicePh} placeholderTextColor={colors.line} style={styles.input} />
        <Label>{t.nvc_statusLabel}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {NVC_STATUSES.map((s) => (
            <Pressable key={s} accessibilityRole="button" onPress={() => setSt(s)} style={[styles.chip, st === s && styles.chipOn]}>
              <Text style={[styles.chipTxt, st === s && { color: colors.onDark }]}>{t.nvc_status[s]}</Text>
            </Pressable>
          ))}
        </View>
        <Label>{t.nvc_dateLabel}</Label>
        <TextInput value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" maxLength={10} placeholder="2026-10-20" placeholderTextColor={colors.line}
          style={[styles.input, { borderColor: validDate ? colors.line : colors.red }]} />
        {msg && <Text style={styles.err}>{msg}</Text>}
        <Button title={t.nvc_save} onPress={save} loading={busy} disabled={!validNum || !validDate} style={{ height: 48 }} />
        <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={{ padding: 6, alignItems: 'center' }}><Text style={styles.link}>{t.nvc_cancel}</Text></Pressable>
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>{t.nvc_title}</Label>
        <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={{ paddingVertical: 6 }}><Text style={styles.link}>{t.nvc_edit}</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: row.nvc_status === 'refused' ? colors.red : DONE.includes(row.nvc_status!) ? colors.green : colors.blue }} />
        <Text style={{ fontFamily: fonts.black, fontSize: 18, color: colors.ink, flex: 1 }}>{row.nvc_status ? t.nvc_status[row.nvc_status] : '—'}</Text>
      </View>
      <View style={styles.kv}><Text style={styles.k}>{t.nvc_caseLabel}</Text><Text style={styles.v}>{row.nvc_case_number}</Text></View>
      {row.nvc_invoice_id ? <View style={styles.kv}><Text style={styles.k}>{t.nvc_invoiceLabel.replace(' (opcional)', '').replace(' (optional)', '')}</Text><Text style={styles.v}>{row.nvc_invoice_id}</Text></View> : null}
      <View style={styles.kv}><Text style={styles.k}>{t.d_lastChange}</Text><Text style={styles.v}>{fmtDate(row.nvc_status_date ?? row.nvc_updated_at, lang) ?? t.d_none}</Text></View>

      {/* Línea de pasos: lo recorrido en azul, lo que falta en gris. */}
      <View style={{ gap: 6, marginTop: 4 }}>
        {NVC_STATUSES.filter((s) => s !== 'refused' && s !== 'administrative_processing').map((s) => {
          const i = NVC_STATUSES.indexOf(s);
          const done = idx >= 0 && i <= idx;
          const cur = s === row.nvc_status;
          return (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: done ? colors.blue : colors.line }} />
              <Text style={{ fontFamily: cur ? fonts.bold : fonts.regular, fontSize: 13, color: done ? colors.ink : colors.muted, flex: 1 }}>{t.nvc_status[s]}</Text>
              {cur && <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{fmtDate(row.nvc_status_date, lang) ?? ''}</Text>}
            </View>
          );
        })}
      </View>

      {row.nvc_status && (
        <>
          <Label>{t.nvc_next}</Label>
          <Text style={styles.body}>{t.nvc_nextOf[row.nvc_status]}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>{t.a2_ai}</Text>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(CEAC_URL)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 6 }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.blue} strokeWidth={2.2} strokeLinecap="round"><Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><Path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></Svg>
          <Text style={styles.link}>{t.nvc_ceac}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={copy} style={{ paddingVertical: 6 }}><Text style={styles.link}>{msg === t.nvc_copied ? t.nvc_copied : t.nvc_copy}</Text></Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.body },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.blue },
  err: { fontFamily: fonts.bold, fontSize: 12, color: colors.red },
  input: { height: 50, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1, color: colors.navy },
  chip: { borderWidth: 2, borderColor: colors.line, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipTxt: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  k: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  v: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, letterSpacing: 0.5 },
});
