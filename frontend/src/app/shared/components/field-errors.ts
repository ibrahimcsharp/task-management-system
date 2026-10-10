import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

import { controlErrorMessage } from '@core/errors/form-errors';

/**
 * Inline validation message for a reactive control.
 *
 * Renders only once the control is touched or dirty, so forms open clean. The
 * lookups are plain method calls (not signals) because form state is not
 * signal-reactive — OnPush views are still re-checked on every bound DOM event.
 */
@Component({
  selector: 'app-field-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <span class="field-error" role="alert">{{ message() }}</span>
    }
  `,
})
export class FieldErrors {
  readonly control = input<AbstractControl | null>(null);

  protected visible(): boolean {
    const control = this.control();
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected message(): string {
    return controlErrorMessage(this.control());
  }
}
