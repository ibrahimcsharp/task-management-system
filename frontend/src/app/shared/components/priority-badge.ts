import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PRIORITY_LABELS, PRIORITY_TOKENS, TaskPriority } from '@core/models';

function isPriority(value: string | null | undefined): value is TaskPriority {
  return !!value && value in PRIORITY_LABELS;
}

/** Coloured pill with a dot for a `TaskPriority`. */
@Component({
  selector: 'app-priority-badge',
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
export class PriorityBadge {
  readonly priority = input<TaskPriority | string | null>(null);
  readonly size = input<'sm' | 'md'>('md');

  protected readonly label = computed(() => {
    const value = this.priority();
    return isPriority(value) ? PRIORITY_LABELS[value] : value ? String(value) : 'Unknown';
  });

  protected readonly colour = computed(() => {
    const value = this.priority();
    return isPriority(value) ? `var(${PRIORITY_TOKENS[value]})` : 'var(--priority-medium)';
  });
}
