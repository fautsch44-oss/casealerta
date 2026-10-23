// HUÉSPED · agente residente. Globo contextual (A1) + conversación "Te lo explico" (A2).
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useT } from '../i18n';
import type { CaseRow } from '../lib/api';
import { bucketFor } from '../lib/receipt';
import { ensureSession, supabase } from '../lib/supabase';
import { colors, fonts, radius, space, touch } from '../theme/tokens';
import { Button, Seal } from './ui';

type Upsell = { title: string; perks: string[] } | null;
type Msg = { role: 'user' | 'assistant'; text: string; upsell?: Upsell; offerTicket?: boolean };

/** Globo de A1: mensaje por dato del caso más urgente, sin llamar al servidor. */
export function HuespedBubble({ cases, onPress }: { cases: CaseRow[]; onPress: () => void }) {
  const { t } = useT();
  if (!cases.length) return null;
  const action = cases.find((c) => bucketFor(c.last_status_text) === 'action');
  const approved = cases.find((c) => bucketFor(c.last_status_text) === 'approved');
  const name = (c: CaseRow) => c.label || c.form_type || c.receipt_number;
  const text = action ? t.h_nudgeAction(name(action)) : approved ? t.h_nudgeApproved(name(approved)) : t.h_nudgeWaiting;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t.h_ask} onPress={onPress} style={styles.bubbleRow}>
      <Seal size={34} border={2} />
      <View style={styles.bubble}><Text style={styles.bubbleText}>{text}</Text></View>
    </Pressable>
  );
}

async function ask(body: Record<string, unknown>) {
  await ensureSession();
  const { data, error } = await supabase.functions.invoke('casealerta-huesped', { body });
  if (error) throw error;
  return data as { reply: string; upsell?: Upsell; offer_ticket?: boolean; limit?: boolean };
}

/** Hoja de conversación. Se abre desde A2 ("Pregúntame") o desde el globo de A1. */
export function HuespedSheet({ visible, onClose, focus }: { visible: boolean; onClose: () => void; focus: CaseRow | null }) {
  const { t, lang } = useT();
  const name = focus ? focus.label || focus.form_type || focus.receipt_number : '';
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const greeting: Msg = { role: 'assistant', text: focus ? t.h_hello(name) : t.h_helloNoCase };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const r = await ask({ message: q, case_id: focus?.id ?? null, lang });
      setMsgs((m) => [...m, { role: 'assistant', text: r.reply, upsell: r.upsell ?? null, offerTicket: !!r.offer_ticket }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', text: t.h_error, offerTicket: true }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const ticket = async () => {
    const lastQ = [...msgs].reverse().find((m) => m.role === 'user')?.text ?? '';
    if (!lastQ) return;
    setBusy(true);
    try {
      const r = await ask({ action: 'ticket', question: lastQ, case_id: focus?.id ?? null, lang });
      setMsgs((m) => [...m, { role: 'assistant', text: r.reply || t.h_ticketDone }]);
    } catch { setMsgs((m) => [...m, { role: 'assistant', text: t.h_error }]); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Seal size={40} border={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>{t.h_title}</Text>
            <Text style={styles.hSub}>{t.h_disclaimer}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t.cancel} onPress={onClose} style={styles.close}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.5} strokeLinecap="round"><Path d="M6 6l12 12M18 6L6 18" /></Svg>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView ref={scroll} contentContainerStyle={{ padding: space.lg, gap: 10 }}>
            {[greeting, ...msgs].map((m, i) => (
              <View key={i} style={{ gap: 8, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <View style={[styles.msg, m.role === 'user' ? styles.msgUser : styles.msgBot]}>
                  <Text style={[styles.msgText, m.role === 'user' && { color: colors.onDark }]}>{m.text}</Text>
                </View>
                {m.upsell && (
                  <View style={styles.upsell}>
                    <Text style={{ fontFamily: fonts.black, fontSize: 14, color: colors.navy }}>{m.upsell.title}</Text>
                    {m.upsell.perks.map((p) => <Text key={p} style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink }}>• {p}</Text>)}
                    <Button title={t.h_upsellCta} variant="navy" onPress={() => { onClose(); router.push({ pathname: '/paywall/example', params: { reason: 'huesped' } }); }} style={{ height: 44, marginTop: 4 }} />
                  </View>
                )}
                {m.offerTicket && (
                  <Pressable accessibilityRole="button" onPress={ticket} style={styles.ticketBtn}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.blue }}>{t.h_ticket}</Text>
                  </Pressable>
                )}
              </View>
            ))}
            {busy && <ActivityIndicator color={colors.blue} style={{ alignSelf: 'flex-start', marginLeft: 8 }} />}
            {msgs.length === 0 && focus && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {t.h_suggest.map((s) => (
                  <Pressable key={s} accessibilityRole="button" onPress={() => send(s)} style={styles.chip}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.blue }}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput value={input} onChangeText={setInput} placeholder={t.h_placeholder} placeholderTextColor={colors.muted}
              style={styles.input} onSubmitEditing={() => send(input)} returnKeyType="send" maxLength={1000} />
            <Pressable accessibilityRole="button" accessibilityLabel={t.h_send} onPress={() => send(input)} disabled={busy || !input.trim()}
              style={[styles.send, (busy || !input.trim()) && { opacity: 0.5 }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.onDark} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M22 2L11 13" /><Path d="M22 2l-7 20-4-9-9-4z" /></Svg>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginTop: 4 },
  bubble: { flex: 1, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.gold, borderRadius: 18, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.ink },
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space.lg, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  hTitle: { fontFamily: fonts.black, fontSize: 18, color: colors.ink },
  hSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  close: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  msg: { maxWidth: '85%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  msgBot: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1.5, borderColor: colors.gold },
  msgUser: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  msgText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  upsell: { maxWidth: '85%', backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: 12, gap: 4 },
  ticketBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.blue, backgroundColor: colors.card },
  inputRow: { flexDirection: 'row', gap: 8, padding: space.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  input: { flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.bg, paddingHorizontal: 16, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
});
