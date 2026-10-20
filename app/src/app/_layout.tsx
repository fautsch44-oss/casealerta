import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold, useFonts } from '@expo-google-fonts/public-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LangProvider } from '../i18n';
import { colors } from '../theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { width } = useWindowDimensions();
  // iPad / pantallas anchas: columna centrada de lectura cómoda; el fondo azul enmarca la app.
  const wide = width > 760;
  const [loaded] = useFonts({ Cinzel_700Bold, PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LangProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: wide ? 720 : undefined, overflow: 'hidden', borderRadius: wide ? 28 : 0, marginVertical: wide ? 24 : 0 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding/language" />
          <Stack.Screen name="onboarding/receipt" />
          <Stack.Screen name="onboarding/alerts" />
          <Stack.Screen name="paywall/example" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paywall/plans" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="case/[id]/index" />
          <Stack.Screen name="case/[id]/bulletin" />
        </Stack>
        </View>
        </View>
      </LangProvider>
    </GestureHandlerRootView>
  );
}
