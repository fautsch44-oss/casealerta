import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { PurchasesPackage } from 'react-native-purchases';
import { Button } from '../../components/ui';
import { useT } from '../../i18n';
import { getPackages, purchase, restore, type Plan } from '../../lib/purchases';
import { colors, fonts, radius, space, touch } from '../../theme/tokens';

const PRICES: Record<Plan, string> = { annual: '$69.99', monthly: '$9.99', family: '$14.99' };

export default function PaywallPlans() {
  const { t } = useT();
  const [plan, setPlan] = useState<Plan>('annual');
  const [pk, setPk] = useState<Partial<Record<Plan, PurchasesPackage>>>({});
  const [busy, setBusy] = useState(false);
  const [storeReady, setStoreReady] = useState<boolean | null>(null);

  useEffect(() => {
    getPackages().then((p) => { setPk(p); setStoreReady(Object.keys(p).length > 0); }).catch(() => setStoreReady(false));
  }, []);

  const done = () => router.replace('/(tabs)/cases');
  const buy = async () => {
    const pkg = pk[plan];
    if (!pkg) { Alert.alert('CaseAlerta', t.p2_unavailable, [{ text: t.ok, onPress: done }]); return; }
    setBusy(true);
    try { if (await purchase(pkg)) done(); }
    catch (e: any) { if (!e?.userCancelled) Alert.alert('CaseAlerta', e?.message ?? t.p2_unavailable); }
    finally { setBusy(false); }
  };
  const doRestore = async () => { if (await restore().catch(() => false)) done(); };

  const Option = ({ id, title, sub, price, suffix, badge }: { id: Plan; title: string; sub: string; price: string; suffix?: string; badge?: string }) => {
    const on = plan === id;
    const live = pk[id]?.product.priceString;
    return (
      <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setPlan(id)}
        style={[styles.opt, { borderColor: on ? colors.blue : colors.line, borderWidth: on ? 3 : 2 }]}>
        {badge && <Text style={styles.badge}>{badge}</Text>}
        <View style={[styles.radio, on && { borderColor: colors.blue }]}>{on && <View style={styles.radioDot} />}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fonts.black, fontSize: 17, color: colors.ink }}>{title}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{sub}</Text>
        </View>
        <Text style={{ fontFamily: fonts.black, fontSize: 22, color: colors.navy }}>{live ?? price}{suffix && !live ? <Text style={{ fontSize: 12, color: colors.muted, fontFamily: fonts.semibold }}>{suffix}</Text> : null}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.back} onPress={() => router.back()} style={styles.back}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
          </Pressable>
          <Text style={styles.stepTxt}>{t.step(2, 2)}</Text>
          <View style={{ width: touch }} />
        </View>
        <Text style={styles.h1}>{t.p2_title}</Text>
        <View style={{ gap: 10, marginTop: 6 }}>
          <Option id="annual" title={t.p2_annual} sub={t.p2_annualSub} price={PRICES.annual} badge={t.p2_save} />
          <Option id="monthly" title={t.p2_monthly} sub={t.p2_monthlySub} price={PRICES.monthly} suffix="/mes" />
          <Option id="family" title={t.p2_family} sub={t.p2_familySub} price={PRICES.family} suffix="/mes" />
        </View>
        <View style={styles.how}>
          <Text style={{ fontFamily: fonts.black, fontSize: 13, color: colors.ink }}>{t.p2_howTitle}</Text>
          {[t.p2_how1, t.p2_how2, t.p2_how3].map((s) => <Text key={s} style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.ink }}>{s}</Text>)}
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ gap: 10 }}>
          <Button title={t.p2_cta} variant="navy" onPress={buy} loading={busy || storeReady === null}
            icon={<Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.onDark} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 3a6 6 0 0 1 6 6v3l1 2H5l1-2V9a6 6 0 0 1 6-6z" /><Path d="M9 17a3 3 0 0 0 6 0" /></Svg>} />
          <Text style={styles.note}>{t.p2_note}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
            <Pressable onPress={() => Linking.openURL('https://casealerta.com/terminos')}><Text style={styles.link}>{t.p2_terms}</Text></Pressable>
            <Pressable onPress={() => Linking.openURL('https://casealerta.com/privacidad')}><Text style={styles.link}>{t.p2_privacy}</Text></Pressable>
            <Pressable onPress={doRestore}><Text style={styles.link}>{t.p2_restore}</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: 8, paddingBottom: space.lg, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  h1: { fontFamily: fonts.black, fontSize: 26, lineHeight: 31, color: colors.ink },
  opt: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { position: 'absolute', top: -12, right: 16, backgroundColor: colors.gold, color: colors.navy, fontFamily: fonts.black, fontSize: 11, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, overflow: 'hidden' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.blue },
  how: { backgroundColor: colors.blueSoft, borderRadius: radius.md, padding: 14, gap: 6 },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' },
  link: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
});
