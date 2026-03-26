import 'react-native-url-polyfill/auto';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BACKEND_PORT = '8000';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost']);

const normalizeUrl = (value: string | null | undefined) => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  try {
    return new URL(candidate).toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

const extractHostname = (value: string | null | undefined) => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  try {
    return new URL(candidate).hostname || null;
  } catch {
    return null;
  }
};

const buildLocalBackendBaseUrl = (hostname: string) => `http://${hostname}:${DEFAULT_BACKEND_PORT}`;

export const getBackendBaseUrl = () => {
  const configuredBaseUrl = normalizeUrl(process.env.EXPO_PUBLIC_BACKEND_API_URL);
  const configuredHost = extractHostname(configuredBaseUrl);

  if (configuredBaseUrl) {
    if (Platform.OS === 'web' || !configuredHost || !LOOPBACK_HOSTS.has(configuredHost)) {
      return configuredBaseUrl;
    }
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname) {
    return buildLocalBackendBaseUrl(window.location.hostname);
  }

  const expoHost =
    extractHostname(Constants.expoConfig?.hostUri) ||
    extractHostname(Constants.linkingUri) ||
    extractHostname(Constants.experienceUrl);

  if (expoHost && !LOOPBACK_HOSTS.has(expoHost)) {
    return buildLocalBackendBaseUrl(expoHost);
  }

  return configuredBaseUrl;
};

export const buildBackendUrl = (path: string) => {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getBackendConfigurationError = () => {
  if (Platform.OS === 'web') {
    return 'Backend URL is missing. Set EXPO_PUBLIC_BACKEND_API_URL or run the API on this machine at port 8000.';
  }

  return "Backend URL is missing. Set EXPO_PUBLIC_BACKEND_API_URL to your computer's reachable local IP, for example http://192.168.1.10:8000.";
};

export const formatBackendRequestError = (error: unknown, targetUrl?: string | null) => {
  const detail = error instanceof Error ? error.message.trim() : String(error ?? '').trim();

  if (/ERR_CONNECTION_REFUSED|Failed to fetch|Network request failed|Load failed|Unable to connect/i.test(detail)) {
    const location = targetUrl ? ` at ${targetUrl}` : '';
    if (Platform.OS === 'web') {
      return `Backend unavailable${location}. Start the API with "cd backend && python -m uvicorn server:app --app-dir src --host 0.0.0.0 --port 8000".`;
    }

    return `Backend unavailable${location}. Start the API and point EXPO_PUBLIC_BACKEND_API_URL to your computer's reachable local IP.`;
  }

  return detail || 'The backend request failed.';
};
