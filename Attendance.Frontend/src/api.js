const BASE_URL = import.meta.env.VITE_API_URL || '/api';

let token = sessionStorage.getItem('jwt_token') || null;

export function setToken(v) {
  token = v;
  if (v) {
    sessionStorage.setItem('jwt_token', v);
  } else {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('jwt_expires');
  }
}

export function getToken() {
  return token;
}

export function isTokenValid() {
  if (!token) return false;
  const expires = sessionStorage.getItem('jwt_expires');
  if (expires) return Date.now() < parseInt(expires);
  return true;
}

export async function api(method, url, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(BASE_URL + url, opts);
  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw { status: res.status, data, message: data?.message || data?.title || 'Request failed' };
  return data;
}
