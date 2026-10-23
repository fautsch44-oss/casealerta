// Menú ≡ de Mis casos (skill flujo-onboarding §2): Pro, ayuda, privacidad, ajustes y otras apps VARGER.
// Hoja inferior iconográfica en estilo TRAZO: mosaicos con ícono grande y una palabra; nada de párrafos.
import * as Application from 'expo-application';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import React from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { track } from '../lib/analytics';
import { colors, fonts, radius, touch } from '../theme/tokens';
import { Icon, type IconName } from './Journey';
import { Seal } from './ui';

type Item = { key: string; icon: IconName; label: string; sub?: string; fg: string; bg: string; go: () => void };

// Apps hermanas ya publicadas. Solo se listan las que tienen enlace vivo (cero textos de relleno).
const SISTER_APPS = [
  { key: 'derate', name: 'DERATE', es: 'Códigos de falla de camión', en: 'Truck fault codes', url: 'https://www.derate.app', icon: 'evidence' as IconName },
];

export function MenuSheet({ visible, onClose, pro, onHelp }: { visible: boolean; onClose: () => void; pro: boolean | null; onHelp: () => void }) {
  const { t, lang } = useT();
  const es = lang === 'es';
  const insets = useSafeAreaInsets();

  const pick = (key: string, fn: () => void) => () => { track('menu_item_tapped', { item: key }); onClose(); setTimeout(fn, 250); };

  const items: Item[] = [
    pro
      ? { key: 'pro', icon: 'shield', label: es ? 'Eres Pro' : "You're Pro", sub: es ? 'Administrar' : 'Manage', fg: colors.navy, bg: colors.goldSoft, go: () => router.push('/(tabs)/settings') }
      : { key: 'pro', icon: 'bell', label: es ? 'Activar Pro' : 'Get Pro', sub: es ? 'Avisos al instante' : 'Instant alerts', fg: colors.red, bg: colors.redSoft, go: () => router.push({ pathname: '/paywall/example', params: { reason: 'menu' } }) },
    { key: 'help', icon: 'chat', label: es ? 'Ayuda' : 'Help', sub: es ? 'Te lo explico' : 'Let me explain', fg: colors.blue, bg: colors.blueSoft, go: onHelp },
    { key: 'privacy', icon: 'lock', label: es ? 'Privacidad' : 'Privacy', sub: es ? 'Sin anuncios' : 'No ads', fg: colors.green, bg: colors.greenSoft, go: () => Linking.openURL(es ? 'https://casealerta.com/privacidad' : 'https://casealerta.com/privacy') },
    { key: 'settings', icon: 'gear', label: es ? 'Ajustes' : 'Settings', sub: es ? 'Avisos e idioma' : 'Alerts & language', fg: colors.blue, bg: colors.blueSoft, go: () => router.push('/(tabs)/settings') },
    { key: 'contact', icon: 'mail', label: es ? 'Escríbenos' : 'Contact us', sub: 'sales@vargersoft.com', fg: colors.amber, bg: colors.goldSoft, go: () => Linking.openURL('mailto:sales@vargersoft.com?subject=CaseAlerta') },
    { key: 'rate', icon: 'star', label: es ? 'Califícanos' : 'Rate us', sub: es ? 'Nos ayuda mucho' : 'It helps a lot', fg: colors.amber, bg: colors.goldSoft, go: async () => { try { if (await StoreReview.hasAction()) await StoreReview.requestReview(); } catch { /* la tienda decide */ } } },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={es ? 'Cerrar menú' : 'Close menu'} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.grab} />
        <View style={styles.head}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Seal size={40} border={2} />
            <Text style={styles.title}>{es ? 'Menú' : 'Menu'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={es ? 'Cerrar' : 'Close'} onPress={onClose} style={styles.close}>
            <Icon name="x" size={26} color={colors.muted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ gap: 18 }} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {items.map((it) => (
              <Pressable key={it.key} accessibilityRole="button" accessibilityLabel={it.label} onPress={pick(it.key, it.go)} style={styles.tile}>
                <View style={[styles.tileIcon, { backgroundColor: it.bg }]}><Icon name={it.icon} size={26} color={it.fg} sw={2.2} /></View>
                <Text style={styles.tileLabel} numberOfLines={1}>{it.label}</Text>
                {it.sub && <Text style={styles.tileSub} numberOfLines={1}>{it.sub}</Text>}
              </Pressable>
            ))}
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="grid" size={18} color={colors.muted} />
              <Text style={styles.section}>{es ? 'OTRAS APPS VARGER' : 'MORE VARGER APPS'}</Text>
            </View>
            {SISTER_APPS.map((a) => (
              <Pressable key={a.key} accessibilityRole="link" onPress={pick(`app_${a.key}`, () => Linking.openURL(a.url))} style={styles.app}>
                <View style={[styles.tileIcon, { backgroundColor: colors.navy, width: 46, height: 46 }]}><Icon name={a.icon} size={22} color={colors.onDark} sw={2.2} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appName}>{a.name}</Text>
                  <Text style={[styles.tileSub, { textAlign: 'left' }]}>{es ? a.es : a.en}</Text>
                </View>
                <Icon name="send" size={18} color={colors.blue} />
              </Pressable>
            ))}
          </View>

          <View style={styles.foot}>
            {[es ? 'Sin anuncios' : 'No ads', es ? 'Sin venta de datos' : 'No data selling', es ? 'Sin rastreo' : 'No tracking'].map((x) => (
              <View key={x} style={styles.chip}><Icon name="check" size={13} color={colors.green} sw={3} /><Text style={styles.chipTxt}>{x}</Text></View>
            ))}
          </View>
          <Text style={styles.version}>{t.a3_version} {Application.nativeApplicationVersion ?? '1.0.0'} · VARGER Group LLC</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,42,107,0.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 18, paddingTop: 10, maxHeight: '86%' },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontFamily: fonts.black, fontSize: 22, color: colors.ink },
  close: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31.5%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', gap: 6, minHeight: 112 },
  tileIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontFamily: fonts.black, fontSize: 13, color: colors.ink, textAlign: 'center' },
  tileSub: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted, textAlign: 'center' },
  section: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 1, color: colors.muted },
  app: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 18, padding: 12, minHeight: touch },
  appName: { fontFamily: fonts.black, fontSize: 15, color: colors.ink },
  foot: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenSoft, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 },
  chipTxt: { fontFamily: fonts.bold, fontSize: 11, color: colors.green },
  version: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted, textAlign: 'center' },
});
