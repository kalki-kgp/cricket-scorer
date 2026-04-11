import type { Match, MatchState } from '@/types/cricket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchMatch(): Promise<MatchState | null> {
  try {
    const res = await fetch(`${API_URL}/api/match`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchAllMatches(): Promise<Match[]> {
  try {
    const res = await fetch(`${API_URL}/api/matches`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Login failed');
  }
  return res.json() as Promise<{ token: string; username: string }>;
}

// AuthError is thrown when the server returns 401 — umpire page uses this
// to clear localStorage and redirect to /login rather than showing a generic toast.
export class AuthError extends Error {
  constructor(message = 'Session expired') {
    super(message);
    this.name = 'AuthError';
  }
}

async function authedPost(path: string, token: string, body: unknown) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Request failed');
  }
  return res.json();
}

// Called on umpire page load to verify the stored token is still valid
export async function checkAuth(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/auth/check`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function updateScore(token: string, payload: unknown) {
  return authedPost('/update-score', token, payload);
}

export function quickAction(token: string, match_id: number, action: string, value?: number) {
  return authedPost('/quick-action', token, { match_id, action, value });
}

export function swapStrike(token: string, match_id: number) {
  return authedPost('/swap-strike', token, { match_id });
}

export function setMatchLive(token: string, match_id: number) {
  return authedPost(`/matches/${match_id}/set-live`, token, {});
}

export function completeMatch(token: string, match_id: number) {
  return authedPost(`/matches/${match_id}/complete`, token, {});
}
