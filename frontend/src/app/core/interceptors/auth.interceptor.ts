import { HttpInterceptorFn } from '@angular/common/http';

import { readStoredToken } from '../services/session';

/** Endpoints that must never carry a stale bearer token. */
const PUBLIC_SUFFIXES = ['/auth/login', '/auth/register'];

function isPublicEndpoint(url: string): boolean {
  return PUBLIC_SUFFIXES.some((suffix) => url.endsWith(suffix));
}

/**
 * Attaches `Authorization: Bearer <token>` to every request except login/register.
 *
 * The token is read straight from localStorage instead of injecting `AuthService`,
 * because `AuthService` depends on `HttpClient` — injecting it here would create a
 * circular dependency during client construction.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = readStoredToken();

  if (!token || isPublicEndpoint(req.url)) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
