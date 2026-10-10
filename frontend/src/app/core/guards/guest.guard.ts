import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Keeps signed-in users away from `/login` and `/register`;
 * honours `returnUrl` when bouncing them back into the app.
 */
export const guestGuard: CanActivateFn = (route): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  const returnUrl = route.queryParamMap.get('returnUrl');
  if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return router.parseUrl(returnUrl);
  }

  return router.createUrlTree(['/dashboard']);
};
