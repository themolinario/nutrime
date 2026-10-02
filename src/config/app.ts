/**
 * App-wide switches and endpoints. Everything here ships inside the app: the
 * Supabase publishable key is designed to be public — row-level security on the
 * server is what protects each user's data.
 */

export const SUPABASE_URL = 'https://whvgnqsfnmrzklgfqict.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dqgtxeT5Z9mxGcSrU4x3oA_1OJBd-ck';

/**
 * Google sign-in (Google Cloud project, OAuth clients). The web client is the
 * audience of the ID token that Supabase checks; iOS also needs its own client.
 * Android is matched by package name + signing certificate, no id needed here.
 * While `webClientId` is empty the Google button stays hidden.
 */
export const GOOGLE_AUTH: { webClientId: string; iosClientId: string } = {
  webClientId: '793646470458-a3i9bd3lrqakrvho8k6ihunqsfbo51i2.apps.googleusercontent.com',
  iosClientId: '793646470458-keco1l5iqdd5u08u4dub2n1oev7v6l4o.apps.googleusercontent.com',
};

/**
 * Internal feature flags. `developerPromo` is the master switch for the developer
 * banner and section: set it to false to remove both in the next build. To turn
 * the banner off without a new build, set `developer_promo` to false in the
 * Supabase `app_config` table — the app reads it at launch.
 */
export const FEATURES = {
  developerPromo: true,
} as const;

/** The developer banner shows on every Nth launch. */
export const DEVELOPER_PROMO_EVERY = 2;

export const DEVELOPER = {
  name: 'Marco Molinari',
  email: 'themolinario@gmail.com',
} as const;
