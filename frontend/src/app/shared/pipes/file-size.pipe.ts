import { Pipe, PipeTransform } from '@angular/core';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/** `15360` -> `15 KB`. Uses binary-style 1024 steps with one decimal above 1 KB. */
@Pipe({
  name: 'fileSize',
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number | string | null | undefined, decimals = 1): string {
    const value = typeof bytes === 'string' ? Number(bytes) : bytes;
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    if (value <= 0) {
      return '0 B';
    }

    const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), UNITS.length - 1);
    const scaled = value / Math.pow(1024, exponent);
    const digits = exponent === 0 ? 0 : Math.max(0, decimals);

    return `${scaled.toFixed(digits)} ${UNITS[exponent]}`;
  }
}
