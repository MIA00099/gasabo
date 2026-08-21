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

/**
 * Called when the server rejects our credentials mid-session.
 *
 * Clearing localStorage on a 401 was only half the job: storage emptied but
 * nothing told the app, so an admin whose token had expired went on looking
 * at the dashboard - their name, their role, the Logout button, the whole
 * shell - while every click failed with "Invalid or expired session". Signed
 * out and unaware of it, with no way back except guessing that Logout would
 * fix a session they no longer had.
 *
 * The state engine registers here at construction, so a 401 from any request
 * ends the session in the UI as well as in storage.
 */
let onExpired = null;

export function setSessionExpiredHandler(fn) {
  onExpired = fn;
}

// fetch() has no built-in timeout - a hung request (a dropped connection, a
// server mid-restart, a backend query that never resolves) would otherwise
// leave the caller's loading state stuck indefinitely with no error ever
// surfaced, since the request() promise itself never settles.
const REQUEST_TIMEOUT_MS = 15000;

// A stable id for this browser, so a signed-out visitor's likes belong to
// somebody. Generated once and kept; it identifies nothing about the person
// and is only ever compared against itself.
const VISITOR_KEY_STORAGE = 'KIGALIMARKET_VISITOR_V1';

export function getVisitorKey() {
  try {
    let key = localStorage.getItem(VISITOR_KEY_STORAGE);
    if (!key) {
      key = (crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(VISITOR_KEY_STORAGE, key);
    }
    return key;
  } catch {
    // Private mode with storage blocked. The like still registers for this
    // page view; it just will not be remembered on the next one.
    return `ephemeral-${Math.random().toString(36).slice(2, 14)}`;
  }
}

async function request(method, path, body) {
  const session = getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  headers['x-visitor-key'] = getVisitorKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.');
    }
    throw new Error('Could not reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Some responses (e.g. 204) have no body - that's fine.
  }

  if (!res.ok) {
    if (res.status === 401) {
      const had = !!session?.token;
      setSession(null);
      // Only for someone who thought they were signed in. A 401 on a public
      // endpoint from a signed-out visitor is not an expiry, and announcing
      // one would be a lie.
      if (had && onExpired) onExpired(data?.error || 'Your session has expired.');
    }
    throw new Error(data?.error || `Request failed (${res.status}).`);
  }

  return data;
}

// Separate from request() above: file uploads need multipart/form-data with
// a browser-generated boundary, so this must NOT set a Content-Type header
// itself (fetch does that correctly only when left alone with a FormData body).
async function uploadFile(path, file) {
  const session = getSession();
  const headers = {};
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const formData = new FormData();
  formData.append('image', file);

  // Longer than the JSON request timeout - a 5MB image on a slow connection
  // legitimately needs more time than a plain API call.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    res = await fetch(`/api${path}`, { method: 'POST', headers, body: formData, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The upload took too long and was cancelled. Please try again.');
    }
    throw new Error('Could not reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    if (res.status === 401) setSession(null);
    throw new Error(data?.error || `Upload failed (${res.status}).`);
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
  uploadFile,
};
