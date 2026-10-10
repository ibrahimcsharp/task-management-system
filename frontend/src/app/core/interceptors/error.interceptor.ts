import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { ApiError } from '../errors/api-error';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Paths whose 401 means "bad credentials", not "session expired". */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register'];

/**
 * 1. Normalises every `HttpErrorResponse` into an `ApiError` (ProblemDetails aware).
 * 2. On 401 outside the auth endpoints, clears the session and redirects to `/login`
 *    with a `returnUrl` so the user lands back where they were.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((raw: unknown) => {
      if (!(raw instanceof HttpErrorResponse)) {
        return throwError(() => raw);
      }

      const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => req.url.endsWith(path));

      if (raw.status === 401 && !isAuthEndpoint) {
        const wasSignedIn = auth.isAuthenticated();
        auth.clearSession();

        const current = router.url.split('?')[0];
        if (wasSignedIn && current !== '/login') {
          toast.info('Your session has expired. Please sign in again.', 'Signed out');
          void router.navigate(['/login'], {
            queryParams: current && current !== '/' ? { returnUrl: current } : undefined,
          });
        }
      }

      return throwError(() => ApiError.fromHttp(raw));
    }),
  );
};
