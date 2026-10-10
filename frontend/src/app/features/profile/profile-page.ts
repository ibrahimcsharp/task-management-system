import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UpdateProfileRequest, UserProfile } from '@core/models';
import { applyApiErrors, clearApiError, markAllTouched } from '@core/errors/form-errors';
import { errorMessage } from '@core/errors/api-error';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { UserService } from '@core/services/user.service';

import { AppIcon } from '@shared/components/app-icon';
import { FieldErrors } from '@shared/components/field-errors';
import { LoadingSpinner } from '@shared/components/loading-spinner';
import { formatDate } from '@shared/utils/format';

/** Mirrors `ValidationRules.PasswordPattern` on the API. */
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppIcon, FieldErrors, LoadingSpinner],
  template: `
    <header class="page-head">
      <div>
        <h1 class="page-title">Profile</h1>
        <p class="page-subtitle">Manage your account details and password.</p>
      </div>
    </header>

    @if (loading()) {
      <app-loading-spinner label="Loading profile…" />
    } @else if (error(); as message) {
      <div class="card card-pad">
        <div class="form-error">
          <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
          <span class="flex-1">{{ message }}</span>
        </div>
        <button type="button" class="btn mt-16" (click)="reload()">Try again</button>
      </div>
    } @else if (profile(); as p) {
      <div class="profile-grid">
        <div class="stack gap-16">
          <section class="card card-pad profile-card">
            <span class="avatar avatar-lg">{{ auth.initials() }}</span>
            <h2 class="profile-name">{{ p.user.fullName }}</h2>
            <p class="text-muted">&#64;{{ p.user.userName }}</p>
            <p class="text-muted text-sm">{{ p.user.email }}</p>
            <div class="row gap-8 wrap justify-center mt-8">
              <span class="badge badge-plain">
                <app-icon [name]="p.user.role === 'Admin' ? 'shield' : 'user'" [size]="12" />
                {{ p.user.role }}
              </span>
              <span class="badge" [class.text-success]="p.user.isActive" [class.text-muted]="!p.user.isActive">
                {{ p.user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <p class="text-subtle text-xs mt-8">
              Member since {{ formatDate(p.user.createdAt) }}
            </p>
          </section>

          <section class="card">
            <div class="card-head">
              <h2 class="section-title">Your numbers</h2>
            </div>
            <div class="card-body stack gap-12">
              <div class="mini-stat">
                <span class="mini-icon"><app-icon name="tasks" [size]="16" /></span>
                <span class="flex-1">Assigned to you</span>
                <span class="mini-value">{{ p.assignedTaskCount }}</span>
              </div>
              <div class="mini-stat">
                <span class="mini-icon"><app-icon name="plus" [size]="16" /></span>
                <span class="flex-1">Tasks you created</span>
                <span class="mini-value">{{ p.createdTaskCount }}</span>
              </div>
              <div class="mini-stat">
                <span class="mini-icon"><app-icon name="folder" [size]="16" /></span>
                <span class="flex-1">Projects owned</span>
                <span class="mini-value">{{ p.projectCount }}</span>
              </div>
            </div>
          </section>
        </div>

        <div class="stack gap-16">
          <section class="card">
            <div class="card-head">
              <h2 class="section-title">Account details</h2>
            </div>
            <div class="card-body">
              @if (profileError(); as message) {
                <div class="form-error mb-16">
                  <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
                  <span>{{ message }}</span>
                </div>
              }

              <form class="form-grid" [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
                <div class="field span-2">
                  <label for="profile-fullname">Full name</label>
                  <input
                    id="profile-fullname"
                    class="input"
                    type="text"
                    formControlName="fullName"
                  />
                  <app-field-errors [control]="profileForm.controls.fullName" />
                </div>
                <div class="field span-2">
                  <label for="profile-email">Email</label>
                  <input id="profile-email" class="input" type="email" formControlName="email" />
                  <app-field-errors [control]="profileForm.controls.email" />
                </div>
                <div class="span-2 form-actions">
                  <button type="submit" class="btn btn-primary" [disabled]="savingProfile()">
                    @if (savingProfile()) {
                      <span class="spinner spinner-light" style="width: 14px; height: 14px;"></span>
                    } @else {
                      <app-icon name="save" [size]="15" />
                    }
                    Save details
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <h2 class="section-title">Change password</h2>
            </div>
            <div class="card-body">
              @if (passwordError(); as message) {
                <div class="form-error mb-16">
                  <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
                  <span>{{ message }}</span>
                </div>
              }

              <form
                class="form-grid"
                [formGroup]="passwordForm"
                (ngSubmit)="changePassword()"
                novalidate
              >
                <div class="field span-2">
                  <label for="profile-current">Current password</label>
                  <input
                    id="profile-current"
                    class="input"
                    type="password"
                    formControlName="currentPassword"
                    autocomplete="current-password"
                  />
                  <app-field-errors [control]="passwordForm.controls.currentPassword" />
                </div>
                <div class="field span-2">
                  <label for="profile-new">New password</label>
                  <input
                    id="profile-new"
                    class="input"
                    type="password"
                    formControlName="newPassword"
                    autocomplete="new-password"
                  />
                  <div [class]="'strength strength-' + strength()">
                    <span></span><span></span><span></span><span></span>
                  </div>
                  <app-field-errors [control]="passwordForm.controls.newPassword" />
                </div>
                <div class="field span-2">
                  <label for="profile-confirm">Confirm new password</label>
                  <input
                    id="profile-confirm"
                    class="input"
                    type="password"
                    formControlName="confirmPassword"
                    autocomplete="new-password"
                  />
                  @if (
                    passwordForm.hasError('passwordMismatch') &&
                    (passwordForm.controls.confirmPassword.touched ||
                      passwordForm.controls.confirmPassword.dirty)
                  ) {
                    <span class="field-error" role="alert">The two passwords do not match.</span>
                  }
                  <app-field-errors [control]="passwordForm.controls.confirmPassword" />
                </div>
                <div class="span-2 form-actions">
                  <button type="submit" class="btn btn-primary" [disabled]="savingPassword()">
                    @if (savingPassword()) {
                      <span class="spinner spinner-light" style="width: 14px; height: 14px;"></span>
                    } @else {
                      <app-icon name="lock" [size]="15" />
                    }
                    Change password
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .profile-grid {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }
      @media (max-width: 960px) {
        .profile-grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      .profile-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 4px;
      }
      .profile-name {
        margin-top: 10px;
        font-size: 18px;
        font-weight: 650;
      }
      .justify-center {
        justify-content: center;
      }

      .mini-stat {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: var(--text-secondary);
      }
      .mini-icon {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        flex: none;
        border-radius: var(--radius-xs);
        background: var(--primary-soft);
        color: var(--primary);
      }
      .mini-value {
        font-size: 15px;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly usersApi = inject(UserService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly formatDate = formatDate;

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly savingProfile = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
  });

  protected readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (group) => {
        const password = group.get('newPassword')?.value;
        const confirm = group.get('confirmPassword')?.value;
        return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
      },
    },
  );

  constructor() {
    for (const control of Object.values(this.profileForm.controls)) {
      control.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        clearApiError(control);
        this.profileError.set(null);
      });
    }
    for (const control of Object.values(this.passwordForm.controls)) {
      control.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        clearApiError(control);
        this.passwordError.set(null);
      });
    }

    this.reload();
  }

  protected strength(): number {
    const value = this.passwordForm.controls.newPassword.value ?? '';
    return [
      value.length >= 8,
      /[A-Z]/.test(value),
      /[a-z]/.test(value),
      /\d/.test(value),
    ].filter(Boolean).length;
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usersApi.me().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.profileForm.reset({
          fullName: profile.user.fullName,
          email: profile.user.email,
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err, 'Could not load your profile.'));
        this.loading.set(false);
      },
    });
  }

  protected saveProfile(): void {
    if (this.savingProfile()) {
      return;
    }
    if (this.profileForm.invalid) {
      markAllTouched(this.profileForm);
      return;
    }

    const value = this.profileForm.getRawValue();
    const payload: UpdateProfileRequest = {
      fullName: (value.fullName ?? '').trim(),
      email: (value.email ?? '').trim(),
    };

    this.savingProfile.set(true);
    this.profileError.set(null);

    this.usersApi.updateMe(payload).subscribe({
      next: (user) => {
        this.savingProfile.set(false);
        this.auth.applyUser(user);
        this.profile.update((profile) => (profile ? { ...profile, user } : profile));
        this.toast.success('Your account details were updated.', 'Profile saved');
      },
      error: (err: unknown) => {
        this.savingProfile.set(false);
        const applied = applyApiErrors(this.profileForm, err);
        if (applied.unmatchedMessages.length) {
          this.profileError.set(applied.unmatchedMessages.join(' '));
        } else if (applied.matched.length === 0) {
          this.profileError.set(errorMessage(err, 'Could not save your profile.'));
        }
      },
    });
  }

  protected changePassword(): void {
    if (this.savingPassword()) {
      return;
    }
    if (this.passwordForm.invalid) {
      markAllTouched(this.passwordForm);
      return;
    }

    const value = this.passwordForm.getRawValue();
    this.savingPassword.set(true);
    this.passwordError.set(null);

    this.usersApi
      .changePassword({
        currentPassword: value.currentPassword ?? '',
        newPassword: value.newPassword ?? '',
      })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
          this.toast.success('Your password was changed.', 'Password updated');
        },
        error: (err: unknown) => {
          this.savingPassword.set(false);
          const applied = applyApiErrors(this.passwordForm, err);
          if (applied.unmatchedMessages.length) {
            this.passwordError.set(applied.unmatchedMessages.join(' '));
          } else if (applied.matched.length === 0) {
            this.passwordError.set(errorMessage(err, 'Could not change your password.'));
          }
        },
      });
  }
}
