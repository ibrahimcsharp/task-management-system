import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';

import { AppIcon, IconName } from './app-icon';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` (default) shows a red warning icon; `neutral` shows a blue info icon. */
  tone?: 'danger' | 'neutral';
}

const DEFAULTS: Required<ConfirmOptions> = {
  title: 'Are you sure?',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'danger',
};

/**
 * Promise-based confirmation built on the native `<dialog>` element.
 *
 * ```ts
 * const ok = await this.confirm.open({ message: 'Delete this task?' });
 * ```
 *
 * Resolves `false` on Cancel, on Escape (which closes the dialog with an empty
 * `returnValue`) or if `open()` is called again while one is pending.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  template: `
    <dialog #dialogEl class="dialog" (close)="onClose($event)">
      @if (options(); as options) {
        <div class="dialog-body">
          <div class="dialog-head">
            <span class="dialog-icon" [class.neutral]="options.tone === 'neutral'">
              <app-icon [name]="icon()" [size]="20" [strokeWidth]="2" />
            </span>
            <div class="flex-1">
              <h3>{{ options.title }}</h3>
              <p class="message">{{ options.message }}</p>
            </div>
            <button type="button" class="dialog-close" (click)="cancel()" aria-label="Close">
              <app-icon name="x" [size]="16" [strokeWidth]="2.2" />
            </button>
          </div>

          <div class="dialog-foot">
            <button type="button" class="btn" (click)="cancel()" #cancelBtn>
              {{ options.cancelLabel }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn-danger]="options.tone === 'danger'"
              [class.btn-primary]="options.tone === 'neutral'"
              (click)="confirm()"
            >
              {{ options.confirmLabel }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
  styles: [
    `
      .message {
        margin-top: 6px;
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--text-muted);
      }
      .dialog-icon.neutral {
        background: var(--info-soft);
        color: var(--info);
      }
    `,
  ],
})
export class ConfirmDialog {
  private readonly dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');
  private readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');
  private resolver: ((value: boolean) => void) | null = null;

  protected readonly options = signal<Required<ConfirmOptions> | null>(null);
  protected readonly icon = signal<IconName>('alertTriangle');

  open(options: ConfirmOptions): Promise<boolean> {
    // Resolve anything still pending so we never leak an unresolved promise.
    this.settle(false);

    const merged: Required<ConfirmOptions> = { ...DEFAULTS, ...options };
    this.options.set(merged);
    this.icon.set(merged.tone === 'neutral' ? 'info' : 'alertTriangle');

    const element = this.dialogEl().nativeElement;
    if (!element.open) {
      element.showModal();
    }

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      // Move focus onto the destructive-safe button once the dialog is on screen.
      setTimeout(() => this.cancelBtn()?.nativeElement.focus(), 0);
    });
  }

  protected confirm(): void {
    this.dialogEl().nativeElement.close('true');
  }

  protected cancel(): void {
    this.dialogEl().nativeElement.close('false');
  }

  protected onClose(event: Event): void {
    const target = event.target as HTMLDialogElement | null;
    this.settle(target?.returnValue === 'true');
    this.options.set(null);
  }

  private settle(value: boolean): void {
    const resolve = this.resolver;
    this.resolver = null;
    resolve?.(value);
  }
}
