import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { STATUS_LABELS, STATUS_TOKENS, TaskStatus } from '@core/models';

function isStatus(value: string | null | undefined): value is TaskStatus {
  return !!value && value in STATUS_LABELS;
}

/** Coloured pill with a dot for a `TaskStatus`. Unknown values fall back to neutral. */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="badge"
      [class.sm]="size() === 'sm'"
      [style.color]="colour()"
      [attr.title]="label()"
    >
      <span class="dot"></span>
      {{ label() }}
    </span>
  `,
  styles: [
    `
      .badge {
        /* colour-mix keeps the tint in sync with the token bound on [style.color] */
        background: color-mix(in srgb, currentColor 10%, #ffffff);
        border-color: color-mix(in srgb, currentColor 24%, #ffffff);
      }
      @supports not (background: color-mix(in srgb, red 10%, white)) {
        .badge {
          background: var(--surface-sunken);
          border-color: var(--border);
        }
      }
      .badge.sm {
        padding: 1px 7px 1px 5px;
        font-size: 11px;
      }
      .badge.sm .dot {
        width: 6px;
        height: 6px;
      }
    `,
  ],
})
export class StatusBadge {
  readonly status = input<TaskStatus | string | null>(null);
  readonly size = input<'sm' | 'md'>('md');

  protected readonly label = computed(() => {
    const value = this.status();
    return isStatus(value) ? STATUS_LABELS[value] : value ? String(value) : 'Unknown';
  });

  protected readonly colour = computed(() => {
    const value = this.status();
    return isStatus(value)
      ? `var(${STATUS_TOKENS[value]})`
      : 'var(--status-not-started)';
  });
}
