/**
 * Centralized API Client Wrapper for Homestay Helper
 * 
 * Provides a unified fetch wrapper with support for:
 * - Base URL from VITE_API_URL
 * - Owner token authentication (Authorization: Bearer <jwt>)
 * - Guest token authentication (X-Guest-Token: <token>)
 * - JSON request/response handling
 * - Normalized ApiError exceptions with HTTP status
 * - Session storage persistence for owner JWT
 */

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let ownerToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ownerToken') : null;
let guestToken = null;

export function setOwnerToken(jwt) {
  ownerToken = jwt;
  if (typeof sessionStorage !== 'undefined') {
    if (jwt) {
      sessionStorage.setItem('ownerToken', jwt);
    } else {
      sessionStorage.removeItem('ownerToken');
    }
  }
}

export function getOwnerToken() {
  if (typeof sessionStorage !== 'undefined' && !ownerToken) {
    ownerToken = sessionStorage.getItem('ownerToken');
  }
  return ownerToken;
}

export function setGuestToken(token) {
  guestToken = token;
}

export function getGuestToken() {
  return guestToken;
}

export function clearTokens() {
  ownerToken = null;
  guestToken = null;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('ownerToken');
  }
}

function getBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_API_URL !== undefined) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL !== undefined) {
    return process.env.VITE_API_URL;
  }
  return '';
}

export async function apiFetch(path, options = {}) {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}${cleanPath}` : cleanPath;

  const headers = new Headers(options.headers || {});

  // Add JSON content-type if body is provided as string/object and content-type is missing
  if (!headers.has('Content-Type') && options.body && (typeof options.body === 'string' || typeof options.body === 'object')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach Owner JWT if set
  const currentOwnerToken = getOwnerToken();
  if (currentOwnerToken) {
    headers.set('Authorization', `Bearer ${currentOwnerToken}`);
  }

  // Attach Guest Token if set
  const currentGuestToken = getGuestToken();
  if (currentGuestToken) {
    headers.set('X-Guest-Token', currentGuestToken);
  }

  const config = {
    ...options,
    headers
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new ApiError(err.message || 'Network request failed', 0, null);
  }

  let data = null;
  const contentType = response.headers ? (response.headers.get('content-type') || '') : '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
  } else if (contentType.includes('text/html')) {
    throw new ApiError('Backend server not reachable or endpoint returned HTML', response.status || 404, null);
  } else {
    try {
      const text = await response.text();
      data = text ? { message: text } : null;
    } catch (e) {
      data = null;
    }
  }

  if (!response.ok) {
    const message = (data && (data.message || data.error)) || response.statusText || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data;
}

export const api = {
  fetch: apiFetch,
  setOwnerToken,
  getOwnerToken,
  setGuestToken,
  getGuestToken,
  clearTokens,
  get: (path, options) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiFetch(path, { ...options, method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(options?.headers) } }),
  put: (path, body, options) => apiFetch(path, { ...options, method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(options?.headers) } }),
  patch: (path, body, options) => apiFetch(path, { ...options, method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(options?.headers) } }),
  delete: (path, options) => apiFetch(path, { ...options, method: 'DELETE' })
};

export default api;
