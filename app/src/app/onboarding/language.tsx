import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Check, Dots, Seal, Wordmark } from '../../components/ui';
import { useT } from '../../i18n';
import type { Lang } from '../../i18n/strings';
import { colors, fonts, radius, space } from '../../theme/tokens';

export default function LanguageScreen() {
  const { t, lang, setLang } = useT();
  const Option = ({ code, label }: { code: Lang; label: string }) => {
    const on = lang === code;
    return (
      <Pressable accessibilityRole="button" onPress={() => setLang(code)}
        style={[styles.opt, { borderColor: on ? colors.blue : colors.line, borderWidth: on ? 3 : 2 }]}>
        <Text style={{ fontFamily: on ? fonts.black : fonts.bold, fontSize: 18, color: colors.navy }}>{label}</Text>
        <View style={[styles.radio, on && { backgroundColor: colors.blue, borderColor: colors.blue }]}>{on && <Check color={colors.onDark} size={18} />}</View>
      </Pressable>
    );
  };
  return (
    <SafeAreaView style={styles.root}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Seal size={96} border={4} />
        <Wordmark size={22} color={colors.navy} />
      </View>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Text style={styles.h1}>{t.o1_title}</Text>
        <Text style={styles.sub}>{t.o1_sub}</Text>
      </View>
      <View style={{ gap: 12 }}>
        <Option code="es" label="Español" />
        <Option code="en" label="English" />
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 14 }}>
        {[t.o1_p1, t.o1_p2, t.o1_p3].map((p) => (
          <View key={p} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Check /><Text style={styles.p}>{p}</Text></View>
        ))}
        <Button title={t.continue} onPress={() => router.push('/onboarding/receipt')} />
        <Dots n={3} active={0} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.xl, paddingTop: 40, paddingBottom: space.lg, gap: 28 },
  h1: { fontFamily: fonts.black, fontSize: 26, lineHeight: 31, color: colors.ink, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.body, textAlign: 'center' },
  opt: { height: 64, borderRadius: radius.md + 2, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  radio: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  p: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, flex: 1 },
});
