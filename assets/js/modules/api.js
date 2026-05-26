const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1') && window.location.protocol !== 'file:';
const isServedByExpress = window.location.port === '5000';

export const API_BASE = (isProduction || isServedByExpress)
  ? '/api'
  : 'http://localhost:5000/api';

export function getToken() { 
  return localStorage.getItem('se_token'); 
}

export function setToken(token) { 
  localStorage.setItem('se_token', token); 
}

export function removeToken() { 
  localStorage.removeItem('se_token'); 
}

export async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const res = await fetch(API_BASE + endpoint, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  } catch (err) {
    throw err;
  }
}
