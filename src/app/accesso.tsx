import * as AppleAuthentication from 'expo-apple-authentication';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Card, Display, Muted, Overline } from '../components/ui';
import { reconcileAfterSignIn } from '../lib/cloud/backup';
import {
  authErrorMessage,
  googleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
} from '../lib/cloud/session';
import { useDietStore } from '../lib/store/useDietStore';
import { colors, fonts, radius, spacing } from '../theme';
import { GoogleButton } from '../components/GoogleButton';
import { Icon } from '../components/Icon';

type Mode = 'signup' | 'signin';

/**
 * Sign up or sign in to back the data up online. Offered once after the
 * introduction (`?first=1`, with a way to skip) and any time from Piano.
 */
export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const firstRun = first === '1';
  const setAuthPrompted = useDietStore((s) => s.setAuthPrompted);

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const leave = () => {
    setAuthPrompted(true);
    if (firstRun || !router.canGoBack()) {
      router.replace(useDietStore.getState().plan ? '/oggi' : '/importa');
    } else {
      router.back();
    }
  };

  const run = async (action: () => Promise<boolean | void>) => {
    setError(null);
    setBusy(true);
    try {
      if ((await action()) === false) return;
      await reconcileAfterSignIn();
      leave();
    } catch (e) {
      setError(
        e instanceof Error && /email per confermare/.test(e.message)
          ? e.message
          : authErrorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = /\S+@\S+\.\S+/.test(email) && password.length >= 8 && !busy;

  const onSubmit = () =>
    run(() =>
      mode === 'signup' ? signUpWithEmail(email, password) : signInWithEmail(email, password),
    );

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.logoMark}>
            <Icon name="cloud-done" size={17} color={colors.white} />
          </View>
          {!firstRun ? (
            <Pressable
              onPress={leave}
              hitSlop={10}
              style={styles.close}
              accessibilityLabel="Chiudi"
            >
              <Icon name="close" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Overline style={styles.overline}>Backup online</Overline>
        <Display style={styles.title}>
          {mode === 'signup' ? 'Crea il tuo account' : 'Ciao di nuovo!'}
        </Display>
        <Body style={styles.intro}>
          Con un account piano, scelte e lista della spesa restano al sicuro online: se cambi
          telefono o reinstalli l’app, ritrovi tutto.
        </Body>

        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              mode === 'signup'
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.md}
            style={styles.apple}
            onPress={() => void run(signInWithApple)}
          />
        ) : null}

        {googleSignInAvailable ? (
          <GoogleButton onPress={() => void run(signInWithGoogle)} disabled={busy} />
        ) : null}

        {appleAvailable || googleSignInAvailable ? (
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Muted>oppure con email</Muted>
            <View style={styles.orLine} />
          </View>
        ) : null}

        <Card style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={styles.input}
            testID="auth-email"
          />
          <View style={styles.inputDivider} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'signup' ? 'Password (almeno 8 caratteri)' : 'Password'}
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            style={styles.input}
            returnKeyType="go"
            onSubmitEditing={() => canSubmit && void onSubmit()}
            testID="auth-password"
          />
        </Card>

        {error ? (
          <View style={styles.error} testID="auth-error">
            <Icon name="alert-circle-outline" size={17} color={colors.danger} />
            <Body style={styles.errorText}>{error}</Body>
          </View>
        ) : null}

        {busy ? (
          <ActivityIndicator color={colors.green} style={styles.busy} />
        ) : (
          <Button
            label={mode === 'signup' ? 'Crea account' : 'Accedi'}
            icon={mode === 'signup' ? 'person-add-outline' : 'log-in-outline'}
            onPress={() => void onSubmit()}
            disabled={!canSubmit}
            testID="auth-submit"
          />
        )}

        <Pressable
          onPress={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup');
            setError(null);
          }}
          hitSlop={8}
          style={styles.switch}
          testID="auth-switch"
        >
          <Body style={styles.switchText}>
            {mode === 'signup' ? 'Hai già un account? ' : 'Non hai un account? '}
            <Body style={styles.switchLink}>{mode === 'signup' ? 'Accedi' : 'Registrati'}</Body>
          </Body>
        </Pressable>

        {firstRun ? (
          <Button
            label="Continua senza account"
            variant="ghost"
            onPress={leave}
            testID="auth-skip"
          />
        ) : null}

        <Muted style={styles.note}>
          Puoi crearlo anche più tardi dalla scheda Piano. Intanto i dati restano sul telefono.
        </Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: { color: colors.green, marginTop: spacing.md },
  title: { fontSize: 32, lineHeight: 38, marginTop: -spacing.sm },
  intro: { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.sm },
  apple: { height: 50 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  form: { paddingHorizontal: spacing.lg },
  input: {
    height: 52,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  inputDivider: { height: 1, backgroundColor: colors.border },
  error: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  errorText: { flex: 1, color: colors.danger, fontSize: 14 },
  busy: { height: 50 },
  switch: { alignSelf: 'center', paddingVertical: spacing.xs },
  switchText: { color: colors.textMuted, fontSize: 14 },
  switchLink: { color: colors.green, fontFamily: fonts.bodySemi, fontSize: 14 },
  note: { textAlign: 'center', fontSize: 12.5, paddingHorizontal: spacing.lg },
});
