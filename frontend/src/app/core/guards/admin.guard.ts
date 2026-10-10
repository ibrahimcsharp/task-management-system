import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Restricts a route to users whose role is `Admin`. */
export const adminGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (auth.isAdmin()) {
    return true;
  }

  toast.error('This area is restricted to administrators.', 'Access denied');
  return router.createUrlTree(['/dashboard']);
};
