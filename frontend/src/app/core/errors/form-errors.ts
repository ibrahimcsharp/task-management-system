import { AbstractControl, FormGroup } from '@angular/forms';

import { fieldErrorsOf } from './api-error';

export interface ApiErrorApplication {
  /** Field names that were matched to a control in the form. */
  matched: string[];
  /** Field names the API returned that have no matching control. */
  unmatched: string[];
  /** Flattened messages for the unmatched fields (rendered as a form level error). */
  unmatchedMessages: string[];
}

/**
 * Maps `ProblemDetails.errors` onto the matching reactive form controls.
 * Matched controls receive an `api` error; unmatched keys are returned so the
 * caller can render them as a form level message.
 */
export function applyApiErrors(form: AbstractControl, err: unknown): ApiErrorApplication {
  const fields = fieldErrorsOf(err);
  const matched: string[] = [];
  const unmatched: string[] = [];
  const unmatchedMessages: string[] = [];

  for (const [key, messages] of Object.entries(fields)) {
    if (!messages.length) {
      continue;
    }
    const control = resolveControl(form, key);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), api: messages.join(' ') });
      control.markAsTouched();
      matched.push(key);
    } else {
      unmatched.push(key);
      unmatchedMessages.push(...messages);
    }
  }

  if (matched.length > 0) {
    form.updateValueAndValidity({ emitEvent: false });
  }

  return { matched, unmatched, unmatchedMessages };
}

/** Marks every control touched so inline errors become visible after a failed submit. */
export function markAllTouched(form: AbstractControl): void {
  if (form instanceof FormGroup) {
    for (const control of Object.values(form.controls)) {
      markAllTouched(control);
    }
  }
  form.markAsTouched();
}

/**
 * Clears only the server supplied `api` error, keeping client side validator
 * state intact. Call this on `valueChanges` so stale server errors disappear.
 */
export function clearApiError(control: AbstractControl | null | undefined): void {
  if (!control || !control.errors || !('api' in control.errors)) {
    return;
  }
  const { api: _api, ...rest } = control.errors;
  control.setErrors(Object.keys(rest).length > 0 ? rest : null);
}

function resolveControl(form: AbstractControl, key: string): AbstractControl | null {
  // Direct hit first ("email"), then dotted paths ("address.city").
  const direct = form.get(key);
  if (direct) {
    return direct;
  }
  const dotted = form.get(key.replace(/\./g, '.'));
  return dotted;
}

/** Validator aware, human readable message for a single control. */
export function controlErrorMessage(control: AbstractControl | null | undefined): string {
  if (!control || !control.errors) {
    return '';
  }
  const errors = control.errors;

  if (errors['api']) {
    return String(errors['api']);
  }
  if (errors['required']) {
    return 'This field is required.';
  }
  if (errors['requiredTrue'] ?? errors['requiredtrue']) {
    return 'This field is required.';
  }
  if (errors['email']) {
    return 'Enter a valid email address, e.g. name@company.com.';
  }
  if (errors['pattern']) {
    const meta = errors['pattern'] as { requiredPattern?: string } | true;
    const pattern = typeof meta === 'object' ? meta.requiredPattern ?? '' : '';
    if (pattern.includes('a-zA-Z0-9')) {
      return 'Only letters, digits, dot, underscore and hyphen are allowed.';
    }
    if (pattern.startsWith('#')) {
      return 'Enter a hex colour such as #3B82F6.';
    }
    return 'The value does not match the required format.';
  }
  if (errors['minlength']) {
    const meta = errors['minlength'] as { requiredLength: number; actualLength: number };
    return `Use at least ${meta.requiredLength} characters (currently ${meta.actualLength}).`;
  }
  if (errors['maxlength']) {
    const meta = errors['maxlength'] as { requiredLength: number };
    return `Keep this under ${meta.requiredLength} characters.`;
  }
  if (errors['min']) {
    return `Must be ${String((errors['min'] as { min: unknown }).min)} or higher.`;
  }
  if (errors['max']) {
    return `Must be ${String((errors['max'] as { max: unknown }).max)} or lower.`;
  }
  if (errors['passwordMismatch']) {
    return 'The two passwords do not match.';
  }
  if (errors['passwordWeak']) {
    return String(errors['passwordWeak']);
  }
  if (errors['invalidDate']) {
    return 'Enter a valid date.';
  }
  if (errors['usernameTaken']) {
    return String(errors['usernameTaken']);
  }

  const firstKey = Object.keys(errors)[0];
  const value = errors[firstKey];
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return 'This field is invalid.';
}
