const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_ORIGIN = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, '')
  : '';

export const API_BASE_URL = `${API_ORIGIN}/api`;

export function apiUrl(path: string): string {
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
