import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, tap } from 'rxjs';

import { environment } from '@env/environment';
import { toInitials } from '@shared/utils/format';

import {
  AuthResult,
  LoginRequest,
  RegisterRequest,
  User,
  UserProfile,
} from '../models';
import {
  clearStoredSession,
  readStoredToken,
  readStoredUser,
  writeStoredSession,
  writeStoredUser,
} from './session';

/**
 * Owns the JWT session: token + user live in localStorage (`tms.token`, `tms.user`)
 * and are mirrored into signals so the shell, guards and admin UI stay reactive.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;

  readonly token = signal<string | null>(readStoredToken());
  readonly currentUser = signal<User | null>(readStoredUser());

  readonly isAuthenticated = computed(() => !!this.token());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  readonly userId = computed(() => this.currentUser()?.id ?? null);
  readonly displayName = computed(
    () => this.currentUser()?.fullName || this.currentUser()?.userName || 'Guest',
  );
  readonly initials = computed(() => toInitials(this.displayName()));

  login(request: LoginRequest): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${this.api}/auth/login`, request)
      .pipe(tap((result) => this.setSession(result)));
  }

  register(request: RegisterRequest): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${this.api}/auth/register`, request)
      .pipe(tap((result) => this.setSession(result)));
  }

  /** `GET /auth/me` — refreshes the stored user. Returns EMPTY when signed out. */
  loadProfile(): Observable<UserProfile> {
    if (!this.isAuthenticated()) {
      return EMPTY;
    }
    return this.http.get<UserProfile>(`${this.api}/auth/me`).pipe(
      tap((profile) => {
        if (profile?.user) {
          this.applyUser(profile.user);
        }
      }),
    );
  }

  /**
   * Fire-and-forget variant used by the app initializer. Errors are swallowed
   * because `errorInterceptor` already clears the session on a 401.
   */
  bootstrapSession(): void {
    this.loadProfile().subscribe({ error: () => undefined });
  }

  /** Keeps the signals (and localStorage) in sync after `PUT /users/me`. */
  applyUser(user: User): void {
    this.currentUser.set(user);
    writeStoredUser(user);
  }

  logout(options: { redirect?: boolean } = {}): void {
    const redirect = options.redirect ?? true;
    clearStoredSession();
    this.token.set(null);
    this.currentUser.set(null);
    if (redirect && !this.router.url.startsWith('/login')) {
      void this.router.navigate(['/login']);
    }
  }

  /** Called by the error interceptor when the API rejects the current token. */
  clearSession(): void {
    clearStoredSession();
    this.token.set(null);
    this.currentUser.set(null);
  }

  private setSession(result: AuthResult): void {
    writeStoredSession(result);
    this.token.set(result.token);
    this.currentUser.set(result.user);
  }
}
