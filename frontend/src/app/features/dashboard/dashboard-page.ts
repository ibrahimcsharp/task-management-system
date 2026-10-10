import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DashboardStats,
  PRIORITY_LABELS,
  PRIORITY_TOKENS,
  STATUS_LABELS,
  STATUS_TOKENS,
} from '@core/models';
import { errorMessage } from '@core/errors/api-error';
import { DashboardService } from '@core/services/dashboard.service';

import { AppIcon, IconName } from '@shared/components/app-icon';
import { EmptyState } from '@shared/components/empty-state';
import { LoadingSpinner } from '@shared/components/loading-spinner';
import { TaskCard } from '@shared/components/task-card';

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppIcon, EmptyState, LoadingSpinner, TaskCard],
  template: `
    <header class="page-head">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">A live snapshot of everything happening across your projects.</p>
      </div>
      <div class="row gap-8">
        <button type="button" class="btn" (click)="reload()" [disabled]="loading()">
          <app-icon name="refresh" [size]="15" />
          Refresh
        </button>
        <a class="btn btn-primary" routerLink="/tasks">
          <app-icon name="tasks" [size]="15" />
          Go to tasks
        </a>
      </div>
    </header>

    @if (loading()) {
      <app-loading-spinner label="Loading your stats…" />
    } @else if (error(); as message) {
      <div class="card card-pad">
        <div class="form-error">
          <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
          <span class="flex-1">{{ message }}</span>
        </div>
        <button type="button" class="btn mt-16" (click)="reload()">Try again</button>
      </div>
    } @else if (stats(); as s) {
      <div class="grid grid-4">
        @for (card of statCards(); track card.label) {
          <div class="card card-pad stat-card">
            <span class="stat-icon" [class]="'stat-' + card.tone">
              <app-icon [name]="card.icon" [size]="19" [strokeWidth]="2" />
            </span>
            <div class="stat-body">
              <span class="eyebrow">{{ card.label }}</span>
              <span class="stat-value">{{ card.value }}</span>
              <span class="stat-hint">{{ card.hint }}</span>
            </div>
          </div>
        }
      </div>

      <div class="grid grid-2 mt-16">
        <section class="card">
          <div class="card-head">
            <h2 class="section-title">Tasks by status</h2>
            <span class="chip">{{ s.totalTasks }} total</span>
          </div>
          <div class="card-body stack gap-12">
            @for (row of byStatus(); track row.name) {
              <div class="bar-row">
                <span class="bar-label">{{ row.label }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    [style.width.%]="row.width"
                    [style.background]="row.color"
                  ></div>
                </div>
                <span class="bar-count">{{ row.count }}</span>
              </div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2 class="section-title">Tasks by priority</h2>
            <span class="chip">{{ s.overdueTasks }} overdue</span>
          </div>
          <div class="card-body stack gap-12">
            @for (row of byPriority(); track row.name) {
              <div class="bar-row">
                <span class="bar-label">{{ row.label }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    [style.width.%]="row.width"
                    [style.background]="row.color"
                  ></div>
                </div>
                <span class="bar-count">{{ row.count }}</span>
              </div>
            }
          </div>
        </section>
      </div>

      <div class="grid grid-2 mt-16">
        <section class="card">
          <div class="card-head">
            <h2 class="section-title">Completed in the last 14 days</h2>
            <span class="chip">
              <app-icon name="trendingUp" [size]="13" />
              {{ completedTotal() }} done
            </span>
          </div>
          <div class="card-body">
            <div class="spark">
              @for (day of s.completedLast14Days; track day.date; let i = $index) {
                <div class="spark-col" [attr.title]="day.date + ' — ' + day.count + ' completed'">
                  <div class="spark-bar" [style.height.%]="barHeight(day.count)"></div>
                  <span class="spark-label">{{ i % 2 === 0 ? dayLabel(day.date) : '' }}</span>
                </div>
              }
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2 class="section-title">Upcoming tasks</h2>
            <a class="btn-link" routerLink="/tasks">View all</a>
          </div>
          @if (s.upcomingTasks.length) {
            <div class="upcoming-list">
              @for (task of s.upcomingTasks; track task.id) {
                <app-task-card [task]="task" />
              }
            </div>
          } @else {
            <app-empty-state
              icon="checkCircle"
              title="Nothing due soon"
              message="You have no open tasks with an upcoming due date."
            />
          }
        </section>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .stat-card {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }
      .stat-icon {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        flex: none;
        border-radius: var(--radius-sm);
        background: var(--surface-sunken);
        color: var(--text-muted);
      }
      .stat-icon.stat-primary {
        background: var(--primary-soft);
        color: var(--primary);
      }
      .stat-icon.stat-success {
        background: var(--success-soft);
        color: var(--success);
      }
      .stat-icon.stat-warning {
        background: var(--warning-soft);
        color: var(--warning);
      }
      .stat-icon.stat-danger {
        background: var(--danger-soft);
        color: var(--danger);
      }
      .stat-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .stat-value {
        font-size: 24px;
        font-weight: 680;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        line-height: 1.15;
      }
      .stat-hint {
        font-size: 12px;
        color: var(--text-muted);
      }

      .bar-row {
        display: grid;
        grid-template-columns: 110px minmax(0, 1fr) 42px;
        align-items: center;
        gap: 12px;
      }
      .bar-label {
        font-size: 12.5px;
        font-weight: 550;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bar-track {
        height: 9px;
        border-radius: var(--radius-pill);
        background: var(--surface-sunken);
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: var(--radius-pill);
        background: var(--primary);
        transition: width var(--t-base) var(--ease);
      }
      .bar-count {
        font-size: 12.5px;
        font-weight: 600;
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: var(--text-secondary);
      }

      .spark {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        height: 150px;
        padding-top: 8px;
      }
      .spark-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        height: 100%;
        min-width: 0;
      }
      .spark-bar {
        width: 100%;
        min-height: 3px;
        border-radius: 4px 4px 2px 2px;
        background: linear-gradient(180deg, var(--primary), #6366f1);
        transition: height var(--t-base) var(--ease);
      }
      .spark-label {
        font-size: 10px;
        color: var(--text-subtle);
        font-variant-numeric: tabular-nums;
        min-height: 14px;
      }

      .upcoming-list {
        padding: 4px 0 8px 12px;
      }
    `,
  ],
})
export class DashboardPage {
  private readonly dashboard = inject(DashboardService);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly completedTotal = computed(
    () => this.stats()?.completedLast14Days.reduce((sum, day) => sum + day.count, 0) ?? 0,
  );

  protected readonly statCards = computed<readonly StatCard[]>(() => {
    const s = this.stats();
    if (!s) {
      return [];
    }
    return [
      {
        label: 'Total tasks',
        value: String(s.totalTasks),
        hint: `${s.activeProjects} of ${s.totalProjects} projects active`,
        icon: 'tasks',
        tone: 'primary',
      },
      {
        label: 'In progress',
        value: String(s.inProgressTasks),
        hint: `${s.dueTodayTasks} due today`,
        icon: 'play',
        tone: 'success',
      },
      {
        label: 'Overdue',
        value: String(s.overdueTasks),
        hint: s.overdueTasks ? 'Needs attention today' : 'Everything on track',
        icon: 'alertTriangle',
        tone: 'danger',
      },
      {
        label: 'Completion rate',
        value: `${s.completionRate}%`,
        hint: `${s.completedTasks} of ${s.totalTasks} tasks done`,
        icon: 'checkCircle',
        tone: 'warning',
      },
    ];
  });

  protected readonly byStatus = computed(() => {
    const rows = this.stats()?.byStatus ?? [];
    return this.withWidths(rows, (name) => this.statusLabel(name), (name) => this.statusColor(name));
  });

  protected readonly byPriority = computed(() => {
    const rows = this.stats()?.byPriority ?? [];
    return this.withWidths(
      rows,
      (name) => this.priorityLabel(name),
      (name) => this.priorityColor(name),
    );
  });

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboard.stats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err, 'Could not load dashboard stats.'));
        this.loading.set(false);
      },
    });
  }

  protected barHeight(count: number): number {
    const rows = this.stats()?.completedLast14Days ?? [];
    const max = rows.reduce((peak, day) => Math.max(peak, day.count), 0);
    if (max <= 0) {
      return 0;
    }
    return Math.max(4, Math.round((count / max) * 100));
  }

  protected dayLabel(date: string): string {
    const day = date.slice(8, 10);
    return day.replace(/^0/, '');
  }

  private withWidths(
    rows: readonly { name: string; count: number }[],
    label: (name: string) => string,
    color: (name: string) => string,
  ): readonly BarRow[] {
    const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0);
    return rows.map((row) => ({
      name: row.name,
      label: label(row.name),
      count: row.count,
      color: color(row.name),
      width: max > 0 ? Math.max(2, Math.round((row.count / max) * 100)) : 0,
    }));
  }

  private statusLabel(name: string): string {
    return (STATUS_LABELS as Record<string, string>)[name] ?? name;
  }

  private statusColor(name: string): string {
    return `var(${(STATUS_TOKENS as Record<string, string>)[name] ?? '--status-not-started'})`;
  }

  private priorityLabel(name: string): string {
    return (PRIORITY_LABELS as Record<string, string>)[name] ?? name;
  }

  private priorityColor(name: string): string {
    return `var(${(PRIORITY_TOKENS as Record<string, string>)[name] ?? '--priority-medium'})`;
  }
}

interface StatCard {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}

interface BarRow {
  name: string;
  label: string;
  count: number;
  color: string;
  width: number;
}
