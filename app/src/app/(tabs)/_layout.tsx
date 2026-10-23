import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useT } from '../../i18n';
import { colors, fonts } from '../../theme/tokens';

function CasesIcon({ color }: { color: string }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"><Rect x={4} y={3} width={16} height={18} rx={2} /><Path d="M8 8h8M8 12h8M8 16h5" /></Svg>;
}
function GearIcon({ color }: { color: string }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"><Circle cx={12} cy={12} r={3} /><Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></Svg>;
}

export default function TabsLayout() {
  const { t } = useT();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.blue,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, paddingBottom: 2 },
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.lineSoft, ...(Platform.OS === 'web' ? { height: 62, paddingBottom: 8 } : null) },
    }}>
      <Tabs.Screen name="cases" options={{ title: t.tab_cases, tabBarIcon: ({ color }) => <CasesIcon color={String(color ?? colors.muted)} /> }} />
      <Tabs.Screen name="settings" options={{ title: t.tab_settings, tabBarIcon: ({ color }) => <GearIcon color={String(color ?? colors.muted)} /> }} />
    </Tabs>
  );
}
