import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { applyApiErrors, clearApiError, markAllTouched } from '@core/errors/form-errors';
import { errorMessage } from '@core/errors/api-error';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

import { AppIcon } from '@shared/components/app-icon';
import { FieldErrors } from '@shared/components/field-errors';

/** Mirrors `ValidationRules.PasswordPattern` on the API. */
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const USER_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AppIcon, FieldErrors],
  template: `
    <div class="auth-page">
      <section class="auth-hero">
        <div class="auth-hero-brand">
          <span class="brand-mark">
            <app-icon name="zap" [size]="17" [strokeWidth]="2.2" />
          </span>
          TaskFlow
        </div>

        <div class="auth-hero-copy">
          <h1>Create your account in seconds.</h1>
          <p>
            New accounts start as regular users — an administrator can promote you to project
            owner or admin later from the Users page.
          </p>
        </div>

        <ul class="auth-hero-list">
          <li><app-icon name="check" [size]="17" [strokeWidth]="2.4" /> Personal task queue with statuses and priorities</li>
          <li><app-icon name="check" [size]="17" [strokeWidth]="2.4" /> Shared projects with owners and colours</li>
          <li><app-icon name="check" [size]="17" [strokeWidth]="2.4" /> Comments, attachments and activity at a glance</li>
        </ul>
      </section>

      <section class="auth-panel">
        <div class="auth-card">
          <h2>Create account</h2>
          <p class="auth-lede">Fill in your details to get started.</p>

          @if (formError(); as message) {
            <div class="form-error mb-16">
              <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
              <span>{{ message }}</span>
            </div>
          }

          <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="register-fullname">Full name</label>
              <input
                id="register-fullname"
                class="input"
                type="text"
                formControlName="fullName"
                autocomplete="name"
                placeholder="Ada Lovelace"
              />
              <app-field-errors [control]="form.controls.fullName" />
            </div>

            <div class="field">
              <label for="register-username">User name</label>
              <input
                id="register-username"
                class="input"
                type="text"
                formControlName="userName"
                autocomplete="username"
                placeholder="ada.lovelace"
              />
              <app-field-errors [control]="form.controls.userName" />
            </div>

            <div class="field">
              <label for="register-email">Email</label>
              <input
                id="register-email"
                class="input"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="you@company.com"
              />
              <app-field-errors [control]="form.controls.email" />
            </div>

            <div class="field">
              <label for="register-password">Password</label>
              <input
                id="register-password"
                class="input"
                type="password"
                formControlName="password"
                autocomplete="new-password"
                placeholder="Choose a strong password"
              />
              <div [class]="'strength strength-' + strength()">
                <span></span><span></span><span></span><span></span>
              </div>
              <ul class="req-list">
                <li [class.ok]="checks().length">
                  <app-icon [name]="checks().length ? 'check' : 'x'" [size]="12" [strokeWidth]="2.6" />
                  8+ characters
                </li>
                <li [class.ok]="checks().upper">
                  <app-icon [name]="checks().upper ? 'check' : 'x'" [size]="12" [strokeWidth]="2.6" />
                  Uppercase letter
                </li>
                <li [class.ok]="checks().lower">
                  <app-icon [name]="checks().lower ? 'check' : 'x'" [size]="12" [strokeWidth]="2.6" />
                  Lowercase letter
                </li>
                <li [class.ok]="checks().digit">
                  <app-icon [name]="checks().digit ? 'check' : 'x'" [size]="12" [strokeWidth]="2.6" />
                  Number
                </li>
              </ul>
              <app-field-errors [control]="form.controls.password" />
            </div>

            <div class="field">
              <label for="register-confirm">Confirm password</label>
              <input
                id="register-confirm"
                class="input"
                type="password"
                formControlName="confirmPassword"
                autocomplete="new-password"
                placeholder="Repeat your password"
              />
              @if (
                form.hasError('passwordMismatch') &&
                (form.controls.confirmPassword.touched || form.controls.confirmPassword.dirty)
              ) {
                <span class="field-error" role="alert">The two passwords do not match.</span>
              }
              <app-field-errors [control]="form.controls.confirmPassword" />
            </div>

            <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="submitting()">
              @if (submitting()) {
                <span class="spinner spinner-light" style="width: 15px; height: 15px;"></span>
              }
              {{ submitting() ? 'Creating account…' : 'Create account' }}
            </button>
          </form>

          <p class="auth-alt">Already have an account? <a routerLink="/login">Sign in</a></p>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .brand-mark {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        flex: none;
        border-radius: 9px;
        background: linear-gradient(135deg, var(--primary), #6366f1);
        color: #fff;
      }
    `,
  ],
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      userName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(USER_NAME_PATTERN),
        ],
      ],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      password: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (group) => {
        const password = group.get('password')?.value;
        const confirm = group.get('confirmPassword')?.value;
        return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
      },
    },
  );

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    for (const control of Object.values(this.form.controls)) {
      control.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        clearApiError(control);
        this.formError.set(null);
      });
    }
  }

  protected checks(): { length: boolean; upper: boolean; lower: boolean; digit: boolean } {
    const value = this.form.controls.password.value ?? '';
    return {
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      digit: /\d/.test(value),
    };
  }

  protected strength(): number {
    const flags = this.checks();
    return [flags.length, flags.upper, flags.lower, flags.digit].filter(Boolean).length;
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      markAllTouched(this.form);
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    const value = this.form.getRawValue();
    this.auth
      .register({
        fullName: (value.fullName ?? '').trim(),
        userName: (value.userName ?? '').trim(),
        email: (value.email ?? '').trim(),
        password: value.password ?? '',
      })
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.toast.success(
            `Welcome aboard, ${result.user.fullName || result.user.userName}.`,
            'Account created',
          );
          this.redirect();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          const applied = applyApiErrors(this.form, err);
          this.formError.set(
            applied.unmatchedMessages.join(' ') || errorMessage(err, 'Registration failed.'),
          );
        },
      });
  }

  private redirect(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const target =
      returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
        ? returnUrl
        : '/dashboard';
    void this.router.navigateByUrl(target);
  }
}
