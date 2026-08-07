/**
 * KIGALI MARKET PLATFORM - API Client
 * Thin fetch wrapper: attaches the auth token, parses JSON, and turns
 * non-OK responses into thrown Errors carrying the server's message
 * so callers can show it directly to the user.
 */

const SESSION_KEY = 'KIGALIMARKET_SESSION_V1';

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

async function request(method, path, body) {
  const session = getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Some responses (e.g. 204) have no body - that's fine.
  }

  if (!res.ok) {
    if (res.status === 401) setSession(null);
    throw new Error(data?.error || `Request failed (${res.status}).`);
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
