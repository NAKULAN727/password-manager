import { useAuthStore } from '../../store/useAuthStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

/**
 * Custom lightweight API wrapper with credentials integration for HttpOnly cookies.
 */
async function request(path: string, options: RequestOptions = {}) {
  const url = `${BASE_URL}${path}`;

  const { clearSession } = useAuthStore.getState();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // CRITICAL! Enforces cross-origin attachment of secure HttpOnly cookies
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

  if (!response.ok) {
    // If the backend rejects the session (expired cookie or tampered token), purge frontend state
    if (response.status === 401 || response.status === 403) {
      clearSession();
    }
    throw new Error(data.error || `HTTP Error ${response.status}: Request failed.`);
  }

  return data;
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: any) => request(path, { method: 'POST', body }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
  put: (path: string, body: any) => request(path, { method: 'PUT', body }),
};
