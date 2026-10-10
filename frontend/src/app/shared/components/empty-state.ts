import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AppIcon, IconName } from './app-icon';

/**
 * Illustrated placeholder for empty result sets. Project any call-to-action
 * into the default slot and it renders under the copy.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  template: `
    <div class="empty-state">
      <div class="empty-art">
        <app-icon [name]="icon()" [size]="32" [strokeWidth]="1.6" />
      </div>
      <p class="empty-title">{{ title() }}</p>
      @if (message(); as text) {
        <p class="empty-message">{{ text }}</p>
      }
      <div class="empty-actions">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string | null>(null);
  readonly icon = input<IconName>('inbox');
}
