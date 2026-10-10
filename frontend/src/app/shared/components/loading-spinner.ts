import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Centred spinner used wherever data is being fetched. */
@Component({
  selector: 'app-loading-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading-block" [class.compact]="compact()" role="status" aria-live="polite">
      <span
        class="spinner"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [style.border-width.px]="size() > 20 ? 3 : 2"
      ></span>
      @if (label(); as text) {
        <span>{{ text }}</span>
      }
    </div>
  `,
  styles: [
    `
      .compact {
        padding: 20px;
        gap: 8px;
      }
    `,
  ],
})
export class LoadingSpinner {
  readonly label = input<string | null>(null);
  readonly size = input<number>(26);
  readonly compact = input<boolean>(false);
}
