import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { create } from 'zustand';

import { track } from '../analytics';
import { GOOGLE_AUTH } from '../../config/app';
import { supabase } from './supabase';

type SessionState = {
  session: Session | null;
  /** False until the stored session (if any) has been read back. */
  ready: boolean;
};

/** The signed-in user, mirrored from Supabase so screens can subscribe to it. */
export const useSession = create<SessionState>(() => ({ session: null, ready: false }));

void supabase.auth.getSession().then(({ data }) => {
  useSession.setState({ session: data.session, ready: true });
});
supabase.auth.onAuthStateChange((_event, session) => {
  useSession.setState({ session, ready: true });
});

/** Supabase's English errors, in the app's voice. */
export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(message)) return 'Email o password non corretti.';
  if (/already registered|already been registered/i.test(message))
    return 'Esiste già un account con questa email: prova ad accedere.';
  if (/password should be at least|weak password/i.test(message))
    return 'La password deve avere almeno 8 caratteri.';
  if (/unable to validate email|invalid email|email address .* invalid/i.test(message))
    return 'L’indirizzo email non sembra valido.';
  if (/network|fetch/i.test(message)) return 'Sembra che manchi la connessione: riprova tra poco.';
  if (/play services/i.test(message))
    return 'Per accedere con Google servono i Google Play Services aggiornati.';
  return 'Ops, qualcosa è andato storto. Riprova.';
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  track('account_signed_in', { method: 'email' });
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  // With email confirmation off the session comes back at once; without it the
  // project settings changed and the user must confirm first.
  if (!data.session) throw new Error('Controlla la tua email per confermare l’account.');
  track('account_created', { method: 'email' });
}

/**
 * Native Sign in with Apple: iOS returns an identity token that Supabase checks
 * against the app's bundle id. Returns false when the user cancels.
 */
export async function signInWithApple(): Promise<boolean> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    });
    if (!credential.identityToken) throw new Error('Apple non ha restituito un token.');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;
    track('account_signed_in', { method: 'apple' });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw error;
  }
}

export const googleSignInAvailable = GOOGLE_AUTH.webClientId !== '';

let googleConfigured = false;

/**
 * Native Google sign-in: the system account picker returns an ID token, which
 * Supabase verifies against the web client id. Returns false when the user
 * closes the picker.
 */
export async function signInWithGoogle(): Promise<boolean> {
  if (!googleConfigured) {
    GoogleSignin.configure({
      webClientId: GOOGLE_AUTH.webClientId,
      iosClientId: GOOGLE_AUTH.iosClientId || undefined,
    });
    googleConfigured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return false;
    const token = response.data.idToken;
    if (!token) throw new Error('Google non ha restituito un token.');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
    if (error) throw error;
    track('account_signed_in', { method: 'google' });
    return true;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) return false;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
        throw new Error('Play services non disponibili');
    }
    throw error;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
  // Otherwise the next Google sign-in silently reuses the same account.
  if (googleConfigured) await GoogleSignin.signOut().catch(() => {});
  track('account_signed_out');
}

/** Deletes the account and, through the foreign key, its backup. */
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  track('account_deleted');
  await supabase.auth.signOut();
  if (googleConfigured) await GoogleSignin.revokeAccess().catch(() => {});
}
