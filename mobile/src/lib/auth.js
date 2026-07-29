import AsyncStorage from '@react-native-async-storage/async-storage';
import {Linking} from 'react-native';
import {createClient, processLock} from '@supabase/supabase-js';
import {normalizeApiBaseUrl} from './api';

export const AUTH_CALLBACK_URL = 'moments://auth/callback';

let cachedClient;
let cachedBaseUrl;

async function fetchAuthConfig(apiBaseUrl) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const response = await fetch(`${normalizedBaseUrl}/auth-config`, {
    headers: {Accept: 'application/json'},
  });
  const config = await response.json().catch(() => null);

  if (
    !response.ok ||
    !config?.enabled ||
    !config.supabaseUrl ||
    !config.publishableKey
  ) {
    throw new Error('OAuth is not configured on the Moments service yet.');
  }

  return config;
}

export async function getAuthClient(apiBaseUrl) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (cachedClient && cachedBaseUrl === normalizedBaseUrl) {
    return cachedClient;
  }

  const config = await fetchAuthConfig(normalizedBaseUrl);
  cachedClient = createClient(config.supabaseUrl, config.publishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
  cachedBaseUrl = normalizedBaseUrl;
  return cachedClient;
}

export async function beginOAuth(apiBaseUrl, provider) {
  const config = await fetchAuthConfig(apiBaseUrl);
  if (!config.providers?.includes(provider)) {
    throw new Error(
      `${provider[0].toUpperCase()}${provider.slice(1)} OAuth still needs its client credentials enabled in Supabase.`,
    );
  }
  const client = await getAuthClient(apiBaseUrl);
  const {data, error} = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: AUTH_CALLBACK_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    throw error || new Error(`Could not start ${provider} sign-in.`);
  }

  await Linking.openURL(data.url);
}

export async function consumeAuthCallback(apiBaseUrl, callbackUrl) {
  if (!callbackUrl?.startsWith(AUTH_CALLBACK_URL)) {
    return null;
  }

  const client = await getAuthClient(apiBaseUrl);
  const separator = callbackUrl.includes('#') ? '#' : '?';
  const params = new URLSearchParams(callbackUrl.split(separator)[1] || '');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const errorDescription = params.get('error_description');

  if (errorDescription) {
    throw new Error(errorDescription);
  }
  if (!accessToken || !refreshToken) {
    throw new Error('The OAuth callback did not contain a valid session.');
  }

  const {data, error} = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function loadAuthSession(apiBaseUrl) {
  const client = await getAuthClient(apiBaseUrl);
  const {data, error} = await client.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signOut(apiBaseUrl) {
  const client = await getAuthClient(apiBaseUrl);
  const {error} = await client.auth.signOut();
  if (error) {
    throw error;
  }
}
