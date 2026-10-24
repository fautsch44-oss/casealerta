import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold, useFonts } from '@expo-google-fonts/public-sans';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LangProvider } from '../i18n';
import { captureError, initAnalytics, track } from '../lib/analytics';
import { colors } from '../theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Pantalla de rescate: si una pantalla truena, se registra en PostHog y la persona puede reintentar sin cerrar la app. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { captureError(error, 'error_boundary'); track('error_shown', { where: 'error_boundary', code: error?.name ?? 'Error' }); }, [error]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }}>
      <Text style={{ color: colors.onDark, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>Algo no salió bien · Something went wrong</Text>
      <Text style={{ color: colors.onDarkMuted, fontSize: 15, textAlign: 'center' }}>Tus casos están a salvo. Toca para intentar de nuevo.{'\n'}Your cases are safe. Tap to try again.</Text>
      <Pressable accessibilityRole="button" onPress={() => retry()} style={{ marginTop: 8, backgroundColor: colors.red, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28, minHeight: 48 }}>
        <Text style={{ color: colors.onDark, fontSize: 16, fontWeight: '800' }}>Reintentar · Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const { width } = useWindowDimensions();
  // iPad / pantallas anchas: columna centrada de lectura cómoda; el fondo azul enmarca la app.
  const wide = width > 760;
  const [loaded] = useFonts({ Cinzel_700Bold, PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  useEffect(() => { initAnalytics(); track('app_opened'); }, []);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LangProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: wide ? 720 : undefined, overflow: 'hidden', borderRadius: wide ? 28 : 0, marginVertical: wide ? 24 : 0 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding/intro" />
          <Stack.Screen name="onboarding/language" />
          <Stack.Screen name="onboarding/receipt" />
          <Stack.Screen name="onboarding/alerts" />
          <Stack.Screen name="paywall/example" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paywall/plans" />
          <Stack.Screen name="paywall/thanks" options={{ gestureEnabled: false }} />
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
