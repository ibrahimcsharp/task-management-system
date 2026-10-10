import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { USER_ROLES, User, UserRole } from '@core/models';
import { errorMessage } from '@core/errors/api-error';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { UserService } from '@core/services/user.service';

import { AppIcon } from '@shared/components/app-icon';
import { EmptyState } from '@shared/components/empty-state';
import { LoadingSpinner } from '@shared/components/loading-spinner';
import { formatDate, toInitials } from '@shared/utils/format';

@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon, EmptyState, LoadingSpinner],
  template: `
    <header class="page-head">
      <div>
        <h1 class="page-title">Users</h1>
        <p class="page-subtitle">Admin area — manage roles and account access.</p>
      </div>
      <button type="button" class="btn" (click)="reload()" [disabled]="loading()">
        <app-icon name="refresh" [size]="15" />
        Refresh
      </button>
    </header>

    <section class="card">
      <div class="card-head">
        <div>
          <h2 class="section-title">Team members</h2>
          <p class="page-subtitle">
            {{ filtered().length }} of {{ users().length }} users
          </p>
        </div>
        <div class="search-field">
          <app-icon name="search" [size]="15" />
          <input
            class="input"
            type="search"
            placeholder="Search name, username or email…"
            [value]="search()"
            (input)="onSearchInput($event)"
          />
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner label="Loading users…" />
      } @else if (error(); as message) {
        <div class="card-body">
          <div class="form-error">
            <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
            <span class="flex-1">{{ message }}</span>
          </div>
          <button type="button" class="btn mt-16" (click)="reload()">Try again</button>
        </div>
      } @else if (filtered().length) {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              @for (user of filtered(); track user.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <span class="avatar avatar-sm">{{ initials(user.fullName || user.userName) }}</span>
                      <div class="user-text">
                        <span class="user-name">
                          {{ user.fullName }}
                          @if (isSelf(user)) {
                            <span class="tag">You</span>
                          }
                        </span>
                        <span class="text-muted text-xs">&#64;{{ user.userName }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="text-muted">{{ user.email }}</td>
                  <td>
                    <select
                      class="select select-sm role-select"
                      [disabled]="isSelf(user) || busyId() === user.id"
                      [attr.title]="isSelf(user) ? 'You cannot change your own role' : 'Change role'"
                      (change)="setRole(user, $event)"
                    >
                      @for (role of roles; track role) {
                        <option [value]="role" [selected]="role === user.role">{{ role }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    <label
                      class="switch"
                      [attr.title]="isSelf(user) ? 'You cannot deactivate your own account' : 'Toggle access'"
                    >
                      <input
                        type="checkbox"
                        [checked]="user.isActive"
                        [disabled]="isSelf(user) || busyId() === user.id"
                        (change)="setActive(user, $event)"
                      />
                      <span class="switch-text">{{ user.isActive ? 'Active' : 'Disabled' }}</span>
                    </label>
                  </td>
                  <td class="text-muted nowrap">{{ joined(user) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <app-empty-state
          icon="users"
          title="No users match"
          [message]="search().trim() ? 'Try a different search term.' : 'No users have registered yet.'"
        />
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .search-field {
        position: relative;
        min-width: 260px;
      }
      .search-field app-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-subtle);
        pointer-events: none;
      }
      .search-field .input {
        padding-left: 32px;
      }

      .user-cell {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .user-text {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
        min-width: 0;
      }
      .user-name {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 560;
        color: var(--text);
      }
      .role-select {
        width: auto;
      }
    `,
  ],
})
export class UsersPage {
  private readonly usersApi = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly roles = USER_ROLES;

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly busyId = signal<number | null>(null);

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.users();
    }
    return this.users().filter(
      (user) =>
        user.fullName.toLowerCase().includes(term) ||
        user.userName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term),
    );
  });

  constructor() {
    this.reload();
  }

  protected initials(name: string): string {
    return toInitials(name);
  }

  protected joined(user: User): string {
    return formatDate(user.createdAt);
  }

  protected isSelf(user: User): boolean {
    return user.id === this.auth.userId();
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected setRole(user: User, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    if (role === user.role || this.busyId() === user.id) {
      return;
    }

    this.busyId.set(user.id);
    this.usersApi.setRole(user.id, role).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.users.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this.toast.success(`${updated.fullName} is now ${updated.role}.`, 'Role updated');
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.toast.error(errorMessage(err, 'Could not update the role.'));
        this.reload();
      },
    });
  }

  protected setActive(user: User, event: Event): void {
    const isActive = (event.target as HTMLInputElement).checked;
    if (isActive === user.isActive || this.busyId() === user.id) {
      return;
    }

    this.busyId.set(user.id);
    this.usersApi.setStatus(user.id, isActive).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.users.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this.toast.success(
          `${updated.fullName} is now ${updated.isActive ? 'active' : 'disabled'}.`,
          'Account updated',
        );
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.toast.error(errorMessage(err, 'Could not update the account.'));
        this.reload();
      },
    });
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usersApi.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err, 'Could not load users.'));
        this.loading.set(false);
      },
    });
  }
}
