import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '@core/services/toast.service';

import { AppIcon, IconName } from './app-icon';

const VARIANT_ICON: Record<string, IconName> = {
  success: 'checkCircle',
  error: 'alertCircle',
  info: 'info',
};

/** Fixed top-right stack of notifications driven by `ToastService`. */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  template: `
    <div class="toast-host" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class.toast-success]="toast.variant === 'success'"
          [class.toast-error]="toast.variant === 'error'"
          [class.toast-info]="toast.variant === 'info'"
          [class.leaving]="toast.leaving"
          role="status"
        >
          <span class="toast-icon">
            <app-icon [name]="iconFor(toast.variant)" [size]="17" [strokeWidth]="2" />
          </span>
          <div class="toast-content">
            <p class="toast-title">{{ toast.title }}</p>
            @if (toast.message) {
              <p class="toast-message">{{ toast.message }}</p>
            }
          </div>
          <button
            type="button"
            class="toast-dismiss"
            (click)="toasts.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <app-icon name="x" [size]="13" [strokeWidth]="2.2" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);

  protected iconFor(variant: string): IconName {
    return VARIANT_ICON[variant] ?? 'info';
  }
}
