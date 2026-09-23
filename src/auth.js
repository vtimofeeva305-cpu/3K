const AUTH_STORAGE_KEY = "three-k-auth-session";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function getAuthConfig() {
  const supabaseUrl = trimTrailingSlash(import.meta.env.VITE_SUPABASE_URL);
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  const telegramProvider = import.meta.env.VITE_SUPABASE_TELEGRAM_PROVIDER || "custom:three-k-telegram";

  return {
    supabaseUrl,
    publishableKey,
    telegramProvider,
    isConfigured: Boolean(supabaseUrl && publishableKey),
    missingKeys: [
      !supabaseUrl && "VITE_SUPABASE_URL",
      !publishableKey && "VITE_SUPABASE_PUBLISHABLE_KEY",
    ].filter(Boolean),
  };
}

function authHeaders(config, session) {
  return {
    apikey: config.publishableKey,
    authorization: `Bearer ${session.accessToken}`,
  };
}

function normalizeSession(payload) {
  const expiresIn = Number(payload.expires_in || 3600);
  const expiresAt = payload.expires_at ? Number(payload.expires_at) * 1000 : Date.now() + expiresIn * 1000;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type || "bearer",
    expiresAt,
    provider: payload.provider || "telegram",
  };
}

function storeSession(session) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    clearStoredSession();
    return null;
  }
}

function cleanAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  for (const key of ["access_token", "refresh_token", "expires_in", "token_type", "provider", "error", "error_description"]) {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, document.title, url.toString());
}

export function consumeSessionFromUrl() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const params = hashParams.has("access_token") || hashParams.has("error") ? hashParams : queryParams;

  const error = params.get("error");
  if (error) {
    const message = params.get("error_description") || error;
    cleanAuthParamsFromUrl();
    return { session: null, error: message };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return { session: null, error: "" };

  const session = normalizeSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: params.get("expires_in"),
    token_type: params.get("token_type"),
    provider: params.get("provider"),
  });
  storeSession(session);
  cleanAuthParamsFromUrl();
  return { session, error: "" };
}

export async function refreshSession(config, session) {
  if (!session?.refreshToken) return null;

  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });

  if (!response.ok) {
    clearStoredSession();
    return null;
  }

  const nextSession = normalizeSession(await response.json());
  storeSession(nextSession);
  return nextSession;
}

export async function getValidSession(config, initialSession = readStoredSession()) {
  if (!initialSession) return null;
  const refreshWindowMs = 90 * 1000;

  if (initialSession.expiresAt && initialSession.expiresAt - Date.now() > refreshWindowMs) {
    return initialSession;
  }

  return refreshSession(config, initialSession);
}

export async function fetchUser(config, session) {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: authHeaders(config, session),
  });

  if (!response.ok) {
    clearStoredSession();
    return null;
  }

  return response.json();
}

export function signInWithTelegram(config) {
  const redirectUrl = new URL(window.location.href);
  redirectUrl.hash = "";
  redirectUrl.search = "";

  const authorizeUrl = new URL(`${config.supabaseUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set("provider", config.telegramProvider);
  authorizeUrl.searchParams.set("redirect_to", redirectUrl.toString());
  window.location.assign(authorizeUrl.toString());
}

export async function signOut(config, session) {
  if (session?.accessToken) {
    await fetch(`${config.supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: authHeaders(config, session),
    }).catch(() => null);
  }
  clearStoredSession();
}
