const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

let onUnauthorized = null;
/** AuthContext registers a handler so an expired session sends the user back to login. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function buildUrl(path, params) {
  const url = `${BASE}${path}`;
  if (!params) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

async function request(method, path, { params, body, silent401 } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = { 'X-Requested-With': 'CampusCare' }; // CSRF guard header expected by the API
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      credentials: 'include',
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    if (res.status === 401 && !silent401) onUnauthorized?.();
    throw new ApiError(json?.message || `Request failed (${res.status})`, res.status, json?.errors);
  }
  return json;
}

export const api = {
  get: (path, params, opts) => request('GET', path, { params, ...opts }),
  post: (path, body) => request('POST', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
};
