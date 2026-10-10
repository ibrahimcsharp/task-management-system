import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Every icon name the app can render. Keeping this a closed union means a typo in
 * a template is a compile error rather than a missing glyph at runtime.
 */
export type IconName =
  | 'activity'
  | 'alertCircle'
  | 'alertTriangle'
  | 'archive'
  | 'arrowLeft'
  | 'arrowRight'
  | 'arrowUp'
  | 'atSign'
  | 'barChart'
  | 'calendar'
  | 'check'
  | 'checkCircle'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronUp'
  | 'clock'
  | 'download'
  | 'edit'
  | 'externalLink'
  | 'eye'
  | 'file'
  | 'filter'
  | 'flag'
  | 'folder'
  | 'image'
  | 'inbox'
  | 'info'
  | 'layers'
  | 'list'
  | 'lock'
  | 'logOut'
  | 'mail'
  | 'menu'
  | 'message'
  | 'moreHorizontal'
  | 'paperclip'
  | 'pieChart'
  | 'play'
  | 'plus'
  | 'refresh'
  | 'save'
  | 'search'
  | 'send'
  | 'settings'
  | 'shield'
  | 'sliders'
  | 'tasks'
  | 'trendingUp'
  | 'upload'
  | 'user'
  | 'users'
  | 'x'
  | 'zap';

/**
 * Lucide-style outline glyphs expressed purely as `<path>` data so the component
 * needs no `innerHTML`/sanitizer escape hatches.
 */
export const ICON_PATHS: Readonly<Record<IconName, readonly string[]>> = {
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  alertCircle: [
    'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
    'M12 8v4',
    'M12 16h.01',
  ],
  alertTriangle: [
    'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z',
    'M12 9v4',
    'M12 17h.01',
  ],
  archive: [
    'M21 8v13H3V8',
    'M2 3h20v5H2z',
    'M10 12h4',
  ],
  arrowLeft: ['m12 19-7-7 7-7', 'M19 12H5'],
  arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
  arrowUp: ['m5 12 7-7 7 7', 'M12 19V5'],
  atSign: [
    'M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8',
    'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  ],
  barChart: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  calendar: [
    'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    'M16 2v4',
    'M8 2v4',
    'M3 10h18',
  ],
  check: ['M20 6 9 17l-5-5'],
  checkCircle: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm22 4-10 10.01-3-3'],
  chevronDown: ['m6 9 6 6 6-6'],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronUp: ['m18 15-6-6-6 6'],
  clock: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z', 'M12 6v6l4 2'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
  externalLink: [
    'M15 3h6v6',
    'M10 14 21 3',
    'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  ],
  eye: [
    'M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  ],
  file: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
  ],
  filter: ['M22 3H2l8 9.46V19l4 2v-8.54Z'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  folder: [
    'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
  ],
  image: [
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M10 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0z',
    'm21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21',
  ],
  inbox: [
    'M22 12h-6l-2 3h-4l-2-3H2',
    'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  ],
  info: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z', 'M12 16v-4', 'M12 8h.01'],
  layers: [
    'm12.83 2.18 8.58 4.29a.5.5 0 0 1 0 .9l-8.58 4.3a2 2 0 0 1-1.66 0L2.59 7.37a.5.5 0 0 1 0-.9l8.58-4.29a2 2 0 0 1 1.66 0Z',
    'm22 12.5-9.17 4.16a2 2 0 0 1-1.66 0L2 12.5',
    'm22 17.5-9.17 4.16a2 2 0 0 1-1.66 0L2 17.5',
  ],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  lock: [
    'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
    'M7 11V7a5 5 0 0 1 10 0v4',
  ],
  logOut: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  mail: [
    'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7',
  ],
  menu: ['M4 12h16', 'M4 6h16', 'M4 18h16'],
  message: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  moreHorizontal: [
    'M8 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0z',
    'M15 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0z',
    'M22 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0z',
  ],
  paperclip: [
    'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48',
  ],
  pieChart: ['M21.21 15.89A10 10 0 1 1 8 2.83', 'M22 12A10 10 0 0 0 12 2v10z'],
  play: ['m6 3 14 9-14 9V3z'],
  plus: ['M5 12h14', 'M12 5v14'],
  refresh: [
    'M3 12a9 9 0 0 1 15-6.7L21 8',
    'M21 3v5h-5',
    'M21 12a9 9 0 0 1-15 6.7L3 16',
    'M3 21v-5h5',
  ],
  save: [
    'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z',
    'M17 21v-8H7v8',
    'M7 3v5h8',
  ],
  search: ['M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z', 'm21 21-4.3-4.3'],
  send: ['m22 2-7 20-4-9-9-4Z', 'M22 2 11 13'],
  settings: [
    'M4 21v-7',
    'M4 10V3',
    'M12 21v-9',
    'M12 8V3',
    'M20 21v-5',
    'M20 12V3',
    'M1 14h6',
    'M9 8h6',
    'M17 16h6',
  ],
  shield: [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'm9 12 2 2 4-4',
  ],
  sliders: [
    'M4 21v-7',
    'M4 10V3',
    'M12 21v-9',
    'M12 8V3',
    'M20 21v-5',
    'M20 12V3',
    'M1 14h6',
    'M9 8h6',
    'M17 16h6',
  ],
  tasks: ['m3 17 2 2 4-4', 'm3 7 2 2 4-4', 'M13 6h8', 'M13 12h8', 'M13 18h8'],
  trendingUp: ['m22 7-8.5 8.5-5-5L2 17', 'M16 7h6v6'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  user: [
    'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2',
    'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  ],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  zap: [
    'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
  ],
};

/**
 * Inline SVG icon. `<app-icon name="tasks" />` renders a stroke glyph that
 * inherits `currentColor`, so icons pick up their parent's text colour.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: none;
        line-height: 0;
      }
      svg {
        display: block;
      }
    `,
  ],
})
export class AppIcon {
  readonly name = input.required<IconName>();
  readonly size = input<number | string>(16);
  readonly strokeWidth = input<number | string>(1.9);

  protected readonly paths = computed<readonly string[]>(
    () => ICON_PATHS[this.name()] ?? [],
  );
}
