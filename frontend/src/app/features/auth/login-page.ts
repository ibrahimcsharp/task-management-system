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

@Component({
  selector: 'app-login-page',
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
          <h1>Plan, track and ship work with your team.</h1>
          <p>
            A clean task management workspace — organise projects, assign tasks, discuss in
            comments and keep an eye on delivery from a live dashboard.
          </p>
        </div>

        <ul class="auth-hero-list">
          <li><app-icon name="check" [size]="17" [strokeWidth]="2.4" /> Projects &amp; colour-coded categories</li>
          <li><app-icon name="check" [size]="17" [strokeWidth]="2.4" /> Comments and file attachments on every task</li>
          <li><app-icon name="check" [size]="17" [strokeWidth]="2.4" /> Dashboard with status, priority and delivery stats</li>
        </ul>
      </section>

      <section class="auth-panel">
        <div class="auth-card">
          <h2>Welcome back</h2>
          <p class="auth-lede">Sign in to continue to your workspace.</p>

          @if (formError(); as message) {
            <div class="form-error mb-16">
              <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
              <span>{{ message }}</span>
            </div>
          }

          <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="login-email">Email</label>
              <input
                id="login-email"
                class="input"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="you@company.com"
              />
              <app-field-errors [control]="form.controls.email" />
            </div>

            <div class="field">
              <label for="login-password">Password</label>
              <input
                id="login-password"
                class="input"
                type="password"
                formControlName="password"
                autocomplete="current-password"
                placeholder="Your password"
              />
              <app-field-errors [control]="form.controls.password" />
            </div>

            <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="submitting()">
              @if (submitting()) {
                <span class="spinner spinner-light" style="width: 15px; height: 15px;"></span>
              }
              {{ submitting() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <p class="auth-alt">
            No account yet? <a routerLink="/register">Create one</a>
          </p>

          <div class="demo-hint">
            <p class="eyebrow">Seeded demo accounts</p>
            <div class="demo-row">
              <span class="tag">Admin</span>
              <span class="text-mono text-xs flex-1 truncate">admin&#64;taskmanager.local / Admin&#64;123</span>
              <button type="button" class="btn-link" (click)="useDemo('admin@taskmanager.local', 'Admin@123')">Use</button>
            </div>
            <div class="demo-row">
              <span class="tag">User</span>
              <span class="text-mono text-xs flex-1 truncate">sarah&#64;taskmanager.local / User&#64;123</span>
              <button type="button" class="btn-link" (click)="useDemo('sarah@taskmanager.local', 'User@123')">Use</button>
            </div>
          </div>
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
      .demo-hint {
        margin-top: 22px;
        padding: 12px 14px;
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-sm);
        background: var(--surface-muted);
      }
      .demo-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 5px 0;
      }
    `,
  ],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

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

  protected useDemo(email: string, password: string): void {
    this.form.setValue({ email, password });
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
      .login({ email: (value.email ?? '').trim(), password: value.password ?? '' })
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.toast.success(
            `Welcome back, ${result.user.fullName || result.user.userName}.`,
            'Signed in',
          );
          this.redirect();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          const applied = applyApiErrors(this.form, err);
          this.formError.set(
            applied.unmatchedMessages.join(' ') || errorMessage(err, 'Sign in failed.'),
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
