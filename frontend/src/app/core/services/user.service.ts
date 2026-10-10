import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import {
  ChangePasswordRequest,
  UpdateProfileRequest,
  User,
  UserLookup,
  UserProfile,
  UserRole,
} from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Admin only. */
  list(): Observable<User[]> {
    return this.http.get<User[]>(`${this.api}/users`);
  }

  lookups(): Observable<UserLookup[]> {
    return this.http.get<UserLookup[]>(`${this.api}/users/lookups`);
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.api}/users/${id}`);
  }

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.api}/auth/me`);
  }

  updateMe(payload: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(`${this.api}/users/me`, payload);
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.api}/users/me/password`, payload);
  }

  /** Admin only. */
  setStatus(id: number, isActive: boolean): Observable<User> {
    return this.http.put<User>(`${this.api}/users/${id}/status`, { isActive });
  }

  /** Admin only. */
  setRole(id: number, role: UserRole): Observable<User> {
    return this.http.put<User>(`${this.api}/users/${id}/role`, { role });
  }
}
