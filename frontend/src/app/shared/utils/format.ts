/** Small formatting helpers shared by components (no Angular DI needed). */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "Ada Lovelace" -> "AL"; single word -> first two letters. */
export function toInitials(name: string | null | undefined): string {
  const value = (name ?? '').trim();
  if (!value) {
    return '?';
  }
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Deterministic hue from a string, used for avatar gradients. */
export function hueFromString(value: string | null | undefined): number {
  const text = value ?? '';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 360;
  }
  return hash;
}

export function parseDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `12 Mar 2026` */
export function formatDate(value: string | number | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) {
    return '—';
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** `12 Mar 2026, 14:05` */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) {
    return '—';
  }
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${formatDate(date)}, ${hh}:${mm}`;
}

/** `2026-03-12` — the value `<input type="date">` expects. */
export function toDateInputValue(value: string | number | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) {
    return '';
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Converts `2026-03-12` into an ISO instant the backend can bind to `DateTime?`. */
export function toIsoDate(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  if (!text) {
    return null;
  }
  const date = parseDate(text.length <= 10 ? `${text}T00:00:00` : text);
  return date ? date.toISOString() : null;
}

/** `Under Review` from `UnderReview`; leaves spaced strings untouched. */
export function humanise(value: string | null | undefined): string {
  const text = (value ?? '').trim();
  if (!text) {
    return '';
  }
  return text.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/** Normalises a colour to `#RRGGBB` (upper case) or returns null. */
export function normaliseHexColour(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  const match = /^#([0-9a-fA-F]{6})$/.exec(text);
  if (match) {
    return `#${match[1].toUpperCase()}`;
  }
  const short = /^#([0-9a-fA-F]{3})$/.exec(text);
  if (short) {
    const [r, g, b] = short[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

/** Mixes a hex colour with white/black to build soft badge backgrounds. */
export function withAlpha(hex: string, alpha: number): string {
  const normalised = normaliseHexColour(hex) ?? '#3B82F6';
  const r = parseInt(normalised.slice(1, 3), 16);
  const g = parseInt(normalised.slice(3, 5), 16);
  const b = parseInt(normalised.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Triggers a browser "save as" for an in-memory blob. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Give the browser a tick to start the download before revoking the URL.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Clamps a number into a range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
