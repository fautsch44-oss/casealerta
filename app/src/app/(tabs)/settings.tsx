import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { track } from '../../lib/analytics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Journey';
import { Brand, Label, Seal } from '../../components/ui';
import { useT } from '../../i18n';
import { deleteAccount, hasProEntitlement, saveProfile } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, space } from '../../theme/tokens';
import { ONBOARDED_KEY } from '../index';

export default function SettingsScreen() {
  const { t, lang, setLang } = useT();
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [pro, setPro] = useState<boolean | null>(null);
  const [osPush, setOsPush] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  // Re-lee el permiso al volver de Ajustes (AppState → active); el usuario cae en el mismo lugar.
  const readPerm = useCallback(() => { Notifications.getPermissionsAsync().then((r) => setOsPush(r.status as any)).catch(() => {}); }, []);
  useEffect(() => { readPerm(); const sub = AppState.addEventListener('change', (st) => { if (st === 'active') readPerm(); }); return () => sub.remove(); }, [readPerm]);
  const tapPush = async () => {
    if (!push) {
      // Pre-permiso: la tarjeta explica para qué; el diálogo del sistema sale solo tras el toque.
      const r = osPush === 'granted' ? { status: 'granted', canAskAgain: true } : await Notifications.requestPermissionsAsync().catch(() => ({ status: 'denied', canAskAgain: false } as any));
      track('permission_result', { permission: 'notifications', granted: r.status === 'granted', can_ask_again: !!r.canAskAgain, where: 'settings' });
      setOsPush(r.status as any);
      if (r.status !== 'granted') return;
    }
    toggle('push_enabled', !push);
  };

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
  // Borrar mi cuenta: borra en el servidor (casos, avisos, historial) y luego en este teléfono. La suscripción de la tienda se cancela aparte.
  const erase = () => Alert.alert(t.a3_signout, lang === 'es'
    ? 'Se borran para siempre tus casos, avisos e historial. Si tienes Pro, cancélalo también en tu cuenta de Apple o Google para que no se cobre.'
    : 'Your cases, alerts and history are deleted forever. If you have Pro, also cancel it in your Apple or Google account so you are not charged.', [
    { text: t.cancel, style: 'cancel' },
    { text: lang === 'es' ? 'Borrar todo' : 'Delete everything', style: 'destructive', onPress: async () => {
      try {
        await deleteAccount();
        track('account_deleted', {});
      } catch {
        track('error_shown', { where: 'delete_account', code: 'delete_failed' });
        Alert.alert(lang === 'es' ? 'No pudimos borrar tu cuenta' : 'We could not delete your account', lang === 'es' ? 'Revisa tu conexión e intenta de nuevo, o escríbenos a sales@vargersoft.com.' : 'Check your connection and try again, or email sales@vargersoft.com.');
        return;
      }
      await supabase.auth.signOut(); await AsyncStorage.removeItem(ONBOARDED_KEY); router.replace('/');
    } },
  ]);

  const es = lang === 'es';
  const Tile = ({ on, icon, label, onPress }: { on: boolean; icon: IconName; label: string; onPress: () => void }) => (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.tile, on && styles.tileOn]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={[styles.tileIcon, { backgroundColor: on ? '#E6EEFA' : colors.bg }]}><Icon name={icon} size={22} color={on ? colors.blue : colors.muted} sw={2.2} /></View>
        <View style={[styles.box, on && { backgroundColor: colors.blue, borderColor: colors.blue }]}>{on && <Icon name="check" size={16} color={colors.onDark} sw={3} />}</View>
      </View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{label}</Text>
    </Pressable>
  );
  const Seg = ({ v, label }: { v: 'es' | 'en'; label: string }) => (
    <Pressable accessibilityRole="button" onPress={() => changeLang(v)} style={[styles.seg, lang === v && styles.segOn]}>
      <Text style={[styles.badge, lang === v && { backgroundColor: 'rgba(255,255,255,0.2)', color: colors.onDark }]}>{v.toUpperCase()}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: lang === v ? colors.onDark : colors.ink }}>{label}</Text>
    </Pressable>
  );
  const Chip = ({ text }: { text: string }) => (
    <View style={styles.chip}><Icon name="check" size={12} color={colors.green} sw={3} /><Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.green }}>{text}</Text></View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Seal size={56} />
              <Brand size={18} />
            </View>
            <View style={styles.avatar}><Icon name="family" size={22} color={colors.navy} sw={2.2} /></View>
          </View>
          <View style={styles.plan}>
            <View style={styles.crown}><Icon name={pro ? 'shield' : 'bell'} size={22} color={colors.amber} sw={2.2} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.black, fontSize: 16, color: colors.ink }}>{pro === null ? '…' : pro ? t.a3_planPro : t.a3_planFree}</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.muted }}>{pro ? (es ? 'Vigilancia diaria · hasta 5 casos' : 'Daily monitoring · up to 5 cases') : (es ? 'Activa avisos al minuto' : 'Turn on instant alerts')}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => (pro ? Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions') : router.push({ pathname: '/paywall/example', params: { reason: 'settings' } }))} style={styles.planBtn}>
              <Text style={{ fontFamily: fonts.black, fontSize: 13, color: colors.onDark }}>{pro ? (es ? 'Administrar' : 'Manage') : (es ? 'Ver Pro' : 'See Pro')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ padding: space.lg, gap: 14 }}>
          <Label>{es ? 'CÓMO TE AVISO' : 'HOW I ALERT YOU'}</Label>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Tile on={push && osPush !== 'denied'} icon="bell" label={es ? 'Celular' : 'Phone'} onPress={tapPush} />
            <Tile on={email} icon="mail" label={es ? 'Correo' : 'Email'} onPress={() => toggle('email_enabled', !email)} />
          </View>

          {osPush === 'denied' && (
            <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} style={styles.permOff}>
              <Icon name="bell" size={18} color={colors.red} sw={2.4} />
              <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.red }}>{t.perm_off}</Text>
              <Text style={{ fontFamily: fonts.black, fontSize: 13, color: colors.blue }}>{t.perm_open}</Text>
            </Pressable>
          )}
          <Label>{t.a3_lang.toUpperCase()}</Label>
          <View style={{ flexDirection: 'row', gap: 10 }}><Seg v="es" label="Español" /><Seg v="en" label="English" /></View>

          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(es ? 'https://casealerta.com/abogados' : 'https://casealerta.com/lawyers')} style={styles.lawyer}>
            <View style={[styles.tileIcon, { backgroundColor: colors.goldSoft }]}><Icon name="review" size={22} color={colors.amber} sw={2.2} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>{es ? 'Abogado en mi ciudad' : 'Lawyer in my city'}</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.muted }}>{es ? 'Solo si tú lo pides' : 'Only if you ask'}</Text>
            </View>
            <Text style={{ fontFamily: fonts.black, fontSize: 22, color: colors.muted }}>›</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <Seal size={34} border={2} />
            <Pressable onPress={() => Linking.openURL(es ? 'https://casealerta.com/privacidad' : 'https://casealerta.com/privacy')} style={styles.priv}>
              <Text style={{ fontFamily: fonts.black, fontSize: 13, color: colors.ink }}>{es ? 'Tu privacidad, primero' : 'Your privacy first'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Chip text={es ? 'Sin anuncios' : 'No ads'} /><Chip text={es ? 'No vendemos datos' : 'No data selling'} /><Chip text={es ? 'Cifrado' : 'Encrypted'} />
              </View>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            <Pressable onPress={() => Linking.openURL('mailto:sales@vargersoft.com?subject=CaseAlerta')}><Text style={styles.linkTxt}>{t.a3_support}</Text></Pressable>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.muted }}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
            <Pressable onPress={erase}><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.red }}>{t.a3_signout}</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.blue, padding: 18, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  plan: { backgroundColor: colors.card, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  crown: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  planBtn: { backgroundColor: colors.blue, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 10, borderWidth: 2, borderColor: colors.line },
  tileOn: { borderColor: colors.blue },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  box: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  seg: { flex: 1, height: 52, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  segOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  badge: { fontFamily: fonts.black, fontSize: 11, color: colors.blue, backgroundColor: '#E6EEFA', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  lawyer: { backgroundColor: colors.card, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  priv: { flex: 1, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.gold, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenSoft, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8 },
  permOff: { backgroundColor: colors.redSoft, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkTxt: { fontFamily: fonts.bold, fontSize: 13, color: colors.blue },
});
