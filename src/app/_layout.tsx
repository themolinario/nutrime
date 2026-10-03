import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
  useFonts as useBricolage,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts as useFigtree,
} from '@expo-google-fonts/figtree';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { DialogHost } from '../components/Dialog';
import { PlantCelebrationHost } from '../components/plant/PlantCelebration';
import { TipHost } from '../components/Tip';
import { useCloudSync } from '../lib/cloud/useCloudSync';
import { instrumentStore, useUsageTracking } from '../lib/usageEvents';
import { useSingleOptionFill } from '../lib/diet/useSingleOptionFill';
import { PdfReaderProvider } from '../lib/pdf/PdfReaderProvider';
import { useIncomingPdf } from '../lib/pdf/useIncomingPdf';
import { useReminderResponses, useReminderScheduling } from '../lib/reminders/useReminders';
import { usePlantCelebrations } from '../lib/usePlantCelebrations';
import { useWidgetSync } from '../lib/widget/useWidgetSync';
import { useLauncherWidget } from '../widgets/LauncherWidget';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
instrumentStore();

/**
 * Sheets on iOS. Android shows modals full screen and edge to edge, so there the
 * content has to clear the status bar itself.
 */
const MODAL = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
  ...(Platform.OS === 'android' && {
    contentStyle: {
      backgroundColor: colors.bg,
      paddingTop: initialWindowMetrics?.insets.top ?? 0,
    },
  }),
} as const;

/** A PDF opened from outside the app always lands on the import screen. */
function IncomingPdfRouter() {
  useIncomingPdf(
    useCallback(() => {
      router.navigate('/importa');
    }, []),
  );
  return null;
}

/** Launches and screens, for the anonymous statistics (only with consent). */
function UsageTracker() {
  useUsageTracking();
  return null;
}

/** A tapped meal reminder opens its day, ticking the meal if asked to. */
function ReminderRouter() {
  useReminderResponses();
  return null;
}

export default function RootLayout() {
  useLauncherWidget();
  useWidgetSync();
  useReminderScheduling();
  useCloudSync();
  useSingleOptionFill();
  usePlantCelebrations();
  const [displayLoaded] = useBricolage({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_800ExtraBold,
  });
  const [bodyLoaded] = useFigtree({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const fontsLoaded = displayLoaded && bodyLoaded;

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <PdfReaderProvider>
          <IncomingPdfRouter />
          <ReminderRouter />
          <UsageTracker />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="importa" options={{ animation: 'fade' }} />
            <Stack.Screen name="scegli" options={MODAL} />
            <Stack.Screen name="giorno/[date]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="aggiungi" options={MODAL} />
            <Stack.Screen name="quantita" options={MODAL} />
            <Stack.Screen name="promemoria" options={MODAL} />
            <Stack.Screen name="benvenuto" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="accesso" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="statistiche"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen name="cronologia" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="peso" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="serra" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account" options={MODAL} />
            <Stack.Screen name="sviluppatore" options={MODAL} />
          </Stack>
          <TipHost />
          <PlantCelebrationHost />
          <DialogHost />
        </PdfReaderProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
