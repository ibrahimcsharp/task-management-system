import { AuthResult, User } from '../models';

/**
 * localStorage keys are part of the app contract, so they live in one place.
 * Interceptors read the token straight from storage rather than injecting
 * `AuthService`, which would create an HttpClient -> interceptor -> HttpClient cycle.
 */
export const TOKEN_KEY = 'tms.token';
export const USER_KEY = 'tms.user';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readStoredToken(): string | null {
  try {
    return storage()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function readStoredUser(): User | null {
  try {
    const raw = storage()?.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<User>;
    return typeof parsed?.id === 'number' && typeof parsed?.email === 'string'
      ? (parsed as User)
      : null;
  } catch {
    return null;
  }
}

export function writeStoredUser(user: User): void {
  try {
    storage()?.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage full or unavailable — the in-memory signal remains authoritative */
  }
}

export function writeStoredSession(result: AuthResult): void {
  try {
    const store = storage();
    store?.setItem(TOKEN_KEY, result.token);
    store?.setItem(USER_KEY, JSON.stringify(result.user));
  } catch {
    /* ignore */
  }
}

export function clearStoredSession(): void {
  try {
    const store = storage();
    store?.removeItem(TOKEN_KEY);
    store?.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}
