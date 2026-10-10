import { Pipe, PipeTransform } from '@angular/core';

import { formatDate, parseDate } from '@shared/utils/format';

export type RelativeDateMode = 'auto' | 'past' | 'due';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Human friendly distance from now.
 *
 * - `auto` (default): past dates read "3h ago", future dates read "in 3 days"
 * - `past`: everything is phrased in the past tense
 * - `due`: today/tomorrow/yesterday get dedicated wording
 *
 * Falls back to `12 Mar 2026` beyond three weeks, and `—` for null/invalid input.
 */
@Pipe({
  name: 'relativeDate',
})
export class RelativeDatePipe implements PipeTransform {
  transform(
    value: string | number | Date | null | undefined,
    mode: RelativeDateMode = 'auto',
  ): string {
    const date = parseDate(value);
    if (!date) {
      return '—';
    }

    const now = Date.now();
    const diff = date.getTime() - now;
    const abs = Math.abs(diff);
    const future = diff > 0;

    if (abs < 45_000) {
      return mode === 'due' ? 'now' : 'just now';
    }

    if (abs < HOUR) {
      const minutes = Math.round(abs / MINUTE);
      return this.plural(minutes, 'minute', future, mode, `${minutes}m`);
    }

    if (abs < DAY) {
      const hours = Math.round(abs / HOUR);
      return this.plural(hours, 'hour', future, mode, `${hours}h`);
    }

    if (abs < 21 * DAY) {
      const days = Math.round(abs / DAY);
      if (mode === 'due') {
        if (days === 1) {
          return future ? 'tomorrow' : 'yesterday';
        }
      }
      return this.plural(days, 'day', future, mode, `${days}d`);
    }

    return formatDate(date);
  }

  private plural(
    amount: number,
    unit: string,
    future: boolean,
    mode: RelativeDateMode,
    compact: string,
  ): string {
    if (mode === 'past') {
      return `${amount} ${unit}${amount === 1 ? '' : 's'} ago`;
    }
    if (future) {
      return `in ${amount} ${unit}${amount === 1 ? '' : 's'}`;
    }
    return `${compact} ago`;
  }
}
