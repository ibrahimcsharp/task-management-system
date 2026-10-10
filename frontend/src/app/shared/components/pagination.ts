import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { AppIcon } from './app-icon';

type PageEntry = number | 'ellipsis';

/** Builds a `1 … 4 5 6 … 20` style window around the active page. */
function pageWindow(current: number, total: number): PageEntry[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const entries: PageEntry[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) {
    entries.push('ellipsis');
  }
  for (let page = start; page <= end; page++) {
    entries.push(page);
  }
  if (end < total - 1) {
    entries.push('ellipsis');
  }

  entries.push(total);
  return entries;
}

/** Server-side pagination footer: range summary, page numbers, prev/next. */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  template: `
    <div class="pagination">
      <span class="pagination-info">
        @if (totalCount() === 0) {
          No results
        } @else {
          Showing {{ from() }}–{{ to() }} of {{ totalCount() }}
        }
      </span>

      @if (totalPages() > 1) {
        <nav class="pagination-pages" aria-label="Pagination">
          <button
            type="button"
            class="page-btn"
            [disabled]="page() <= 1"
            (click)="goTo(page() - 1)"
            aria-label="Previous page"
          >
            <app-icon name="chevronLeft" [size]="15" />
          </button>

          @for (entry of pages(); track $index) {
            @if (entry === 'ellipsis') {
              <span class="page-ellipsis">…</span>
            } @else {
              <button
                type="button"
                class="page-btn"
                [class.active]="entry === page()"
                [attr.aria-current]="entry === page() ? 'page' : null"
                (click)="goTo(entry)"
              >
                {{ entry }}
              </button>
            }
          }

          <button
            type="button"
            class="page-btn"
            [disabled]="page() >= totalPages()"
            (click)="goTo(page() + 1)"
            aria-label="Next page"
          >
            <app-icon name="chevronRight" [size]="15" />
          </button>
        </nav>
      }
    </div>
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly pageSize = input.required<number>();

  readonly pageChange = output<number>();

  protected readonly pages = computed(() => pageWindow(this.page(), this.totalPages()));

  protected readonly from = computed(() => {
    if (this.totalCount() === 0) {
      return 0;
    }
    return (this.page() - 1) * this.pageSize() + 1;
  });

  protected readonly to = computed(() =>
    Math.min(this.page() * this.pageSize(), this.totalCount()),
  );

  protected goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) {
      return;
    }
    this.pageChange.emit(page);
  }
}
