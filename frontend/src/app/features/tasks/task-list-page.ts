import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';

import {
  PagedResult,
  PRIORITY_LABELS,
  Project,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskItem,
  TaskPriority,
  TaskSortField,
  TaskStatus,
  UserLookup,
} from '@core/models';
import { errorMessage } from '@core/errors/api-error';
import { ProjectService } from '@core/services/project.service';
import { TaskService } from '@core/services/task.service';
import { ToastService } from '@core/services/toast.service';
import { UserService } from '@core/services/user.service';

import { AppIcon } from '@shared/components/app-icon';
import { ConfirmDialog } from '@shared/components/confirm-dialog';
import { EmptyState } from '@shared/components/empty-state';
import { LoadingSpinner } from '@shared/components/loading-spinner';
import { Pagination } from '@shared/components/pagination';
import { PriorityBadge } from '@shared/components/priority-badge';
import { StatusBadge } from '@shared/components/status-badge';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';
import { toInitials } from '@shared/utils/format';

import { TaskFormDialog } from './task-form-dialog';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-task-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AppIcon,
    ConfirmDialog,
    EmptyState,
    LoadingSpinner,
    Pagination,
    PriorityBadge,
    StatusBadge,
    RelativeDatePipe,
    TaskFormDialog,
  ],
  template: `
    <header class="page-head">
      <div>
        <h1 class="page-title">Tasks</h1>
        <p class="page-subtitle">
          Search, filter and sort every task you have access to.
        </p>
      </div>
      <button type="button" class="btn btn-primary" (click)="createTask()">
        <app-icon name="plus" [size]="15" />
        New task
      </button>
    </header>

    <section class="card mb-16">
      <div class="filter-bar">
        <div class="field">
          <label for="filter-search">Search</label>
          <div class="search-field">
            <app-icon name="search" [size]="15" />
            <input
              id="filter-search"
              class="input"
              type="search"
              placeholder="Title or description…"
              [value]="search()"
              (input)="onSearchInput($event)"
            />
          </div>
        </div>

        <div class="field">
          <label for="filter-status">Status</label>
          <select
            id="filter-status"
            class="select"
            [value]="statusFilter()"
            (change)="onStatusFilter($event)"
          >
            <option value="">All statuses</option>
            @for (status of statuses; track status) {
              <option [value]="status">{{ statusLabels[status] }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="filter-priority">Priority</label>
          <select
            id="filter-priority"
            class="select"
            [value]="priorityFilter()"
            (change)="onPriorityFilter($event)"
          >
            <option value="">All priorities</option>
            @for (priority of priorities; track priority) {
              <option [value]="priority">{{ priorityLabels[priority] }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="filter-project">Project</label>
          <select
            id="filter-project"
            class="select"
            (change)="onProjectFilter($event)"
          >
            <option value="" [selected]="projectFilter() === null">All projects</option>
            @for (project of projects(); track project.id) {
              <option [value]="project.id" [selected]="projectFilter() === project.id">
                {{ project.name }}
              </option>
            }
          </select>
        </div>

        <div class="field">
          <label for="filter-assignee">Assignee</label>
          <select
            id="filter-assignee"
            class="select"
            [value]="assigneeFilter() ?? ''"
            (change)="onAssigneeFilter($event)"
          >
            <option value="">Anyone</option>
            @for (user of users(); track user.id) {
              <option [value]="user.id">{{ user.fullName }}</option>
            }
          </select>
        </div>

        <div class="filter-bar-extra">
          <label class="switch">
            <input
              type="checkbox"
              [checked]="overdueOnly()"
              (change)="onOverdueToggle($event)"
            />
            <span class="switch-text">Overdue only</span>
          </label>

          <div class="row gap-8 wrap">
            <select
              class="select select-sm sort-select"
              [value]="sortBy()"
              (change)="onSortBy($event)"
              aria-label="Sort by"
            >
              <option value="dueDate">Sort: Due date</option>
              <option value="title">Sort: Title</option>
              <option value="status">Sort: Status</option>
              <option value="priority">Sort: Priority</option>
              <option value="createdAt">Sort: Created</option>
              <option value="updatedAt">Sort: Updated</option>
            </select>
            <button
              type="button"
              class="btn btn-sm"
              (click)="toggleDirection()"
              [attr.title]="sortDescending() ? 'Descending' : 'Ascending'"
            >
              <app-icon
                name="arrowUp"
                [size]="13"
                [style.transform]="sortDescending() ? 'rotate(180deg)' : null"
              />
              {{ sortDescending() ? 'Desc' : 'Asc' }}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              (click)="clearFilters()"
              [disabled]="!hasFilters()"
            >
              <app-icon name="x" [size]="13" />
              Clear filters
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      @if (loading()) {
        <app-loading-spinner label="Loading tasks…" />
      } @else if (error(); as message) {
        <div class="card-body">
          <div class="form-error">
            <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
            <span class="flex-1">{{ message }}</span>
          </div>
          <button type="button" class="btn mt-16" (click)="reload()">Try again</button>
        </div>
      } @else if (paged(); as result) {
        @if (result.items.length) {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable">
                    <button
                      type="button"
                      class="sort-btn"
                      [class.active]="sortBy() === 'title'"
                      [class.desc]="sortBy() === 'title' && sortDescending()"
                      (click)="sort('title')"
                    >
                      Task <app-icon class="arrow" name="arrowUp" [size]="12" />
                    </button>
                  </th>
                  <th class="sortable">
                    <button
                      type="button"
                      class="sort-btn"
                      [class.active]="sortBy() === 'status'"
                      [class.desc]="sortBy() === 'status' && sortDescending()"
                      (click)="sort('status')"
                    >
                      Status <app-icon class="arrow" name="arrowUp" [size]="12" />
                    </button>
                  </th>
                  <th class="sortable">
                    <button
                      type="button"
                      class="sort-btn"
                      [class.active]="sortBy() === 'priority'"
                      [class.desc]="sortBy() === 'priority' && sortDescending()"
                      (click)="sort('priority')"
                    >
                      Priority <app-icon class="arrow" name="arrowUp" [size]="12" />
                    </button>
                  </th>
                  <th class="sortable">
                    <button
                      type="button"
                      class="sort-btn"
                      [class.active]="sortBy() === 'dueDate'"
                      [class.desc]="sortBy() === 'dueDate' && sortDescending()"
                      (click)="sort('dueDate')"
                    >
                      Due <app-icon class="arrow" name="arrowUp" [size]="12" />
                    </button>
                  </th>
                  <th>Assignee</th>
                  <th class="sortable">
                    <button
                      type="button"
                      class="sort-btn"
                      [class.active]="sortBy() === 'updatedAt'"
                      [class.desc]="sortBy() === 'updatedAt' && sortDescending()"
                      (click)="sort('updatedAt')"
                    >
                      Updated <app-icon class="arrow" name="arrowUp" [size]="12" />
                    </button>
                  </th>
                  <th class="th-actions"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                @for (task of result.items; track task.id) {
                  <tr class="clickable" (click)="openTask(task)">
                    <td>
                      <div class="cell-main">
                        <span class="cell-title truncate">{{ task.title }}</span>
                        <span class="cell-sub">
                          @if (task.projectName; as projectName) {
                            <span class="proj">
                              <span
                                class="proj-dot"
                                [style.background]="task.projectColor || 'var(--text-subtle)'"
                              ></span>
                              {{ projectName }}
                            </span>
                          }
                          @if (task.commentCount) {
                            <span class="count">
                              <app-icon name="message" [size]="12" />
                              {{ task.commentCount }}
                            </span>
                          }
                          @if (task.attachmentCount) {
                            <span class="count">
                              <app-icon name="paperclip" [size]="12" />
                              {{ task.attachmentCount }}
                            </span>
                          }
                        </span>
                      </div>
                    </td>
                    <td><app-status-badge [status]="task.status" size="sm" /></td>
                    <td><app-priority-badge [priority]="task.priority" size="sm" /></td>
                    <td
                      class="nowrap"
                      [class.text-danger]="task.isOverdue"
                      [class.fw-600]="task.isOverdue"
                    >
                      {{ task.dueDate | relativeDate: 'due' }}
                    </td>
                    <td>
                      @if (task.assigneeName; as assignee) {
                        <span class="assignee">
                          <span class="avatar avatar-sm">{{ initials(assignee) }}</span>
                          <span class="truncate">{{ assignee }}</span>
                        </span>
                      } @else {
                        <span class="text-subtle">Unassigned</span>
                      }
                    </td>
                    <td class="text-muted nowrap">
                      {{ task.updatedAt ? (task.updatedAt | relativeDate: 'past') : '—' }}
                    </td>
                    <td class="td-actions" (click)="$event.stopPropagation()">
                      <div class="row gap-4 actions">
                        <a
                          class="btn btn-ghost btn-icon btn-sm"
                          [routerLink]="['/tasks', task.id]"
                          title="Open task"
                        >
                          <app-icon name="eye" [size]="15" />
                        </a>
                        <button
                          type="button"
                          class="btn btn-ghost btn-icon btn-sm"
                          (click)="editTask(task)"
                          title="Edit task"
                        >
                          <app-icon name="edit" [size]="15" />
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-icon btn-sm delete"
                          (click)="removeTask(task)"
                          title="Delete task"
                        >
                          <app-icon name="x" [size]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="card-foot">
            <app-pagination
              [page]="result.page"
              [totalPages]="result.totalPages"
              [totalCount]="result.totalCount"
              [pageSize]="result.pageSize"
              (pageChange)="goToPage($event)"
            />
          </div>
        } @else {
          <app-empty-state
            icon="tasks"
            title="No tasks found"
            [message]="hasFilters() ? 'Try adjusting or clearing the filters above.' : 'Create your first task to get started.'"
          >
            @if (hasFilters()) {
              <button type="button" class="btn" (click)="clearFilters()">Clear filters</button>
            }
            <button type="button" class="btn btn-primary" (click)="createTask()">
              <app-icon name="plus" [size]="15" />
              New task
            </button>
          </app-empty-state>
        }
      }
    </section>

    <app-task-form-dialog #taskForm />
    <app-confirm-dialog #confirm />
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .search-field app-icon {
        position: absolute;
        left: 10px;
        color: var(--text-subtle);
        pointer-events: none;
      }

      .filter-bar-extra {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding-top: 4px;
        border-top: 1px dashed var(--border-soft);
      }

      .sort-select {
        width: auto;
      }

      .cell-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 200px;
        max-width: 420px;
      }
      .cell-title {
        font-weight: 560;
        color: var(--text);
      }
      .cell-sub {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .proj {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-weight: 550;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .proj-dot {
        width: 7px;
        height: 7px;
        flex: none;
        border-radius: 50%;
      }
      .count {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .assignee {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        max-width: 190px;
      }

      .delete:hover {
        color: var(--danger);
      }
    `,
  ],
})
export class TaskListPage {
  private readonly tasks = inject(TaskService);
  private readonly projectsApi = inject(ProjectService);
  private readonly usersApi = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly taskForm = viewChild.required<TaskFormDialog>('taskForm');
  private readonly confirm = viewChild.required<ConfirmDialog>('confirm');
  private readonly searchInput$ = new Subject<string>();

  protected readonly statuses = TASK_STATUSES;
  protected readonly priorities = TASK_PRIORITIES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected readonly paged = signal<PagedResult<TaskItem> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly projects = signal<Project[]>([]);
  protected readonly users = signal<UserLookup[]>([]);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<TaskStatus | ''>('');
  protected readonly priorityFilter = signal<TaskPriority | ''>('');
  protected readonly projectFilter = signal<number | null>(null);
  protected readonly assigneeFilter = signal<number | null>(null);
  protected readonly overdueOnly = signal(false);
  protected readonly sortBy = signal<TaskSortField>('dueDate');
  protected readonly sortDescending = signal(false);
  protected readonly page = signal(1);

  protected readonly hasFilters = computed(
    () =>
      !!this.search().trim() ||
      !!this.statusFilter() ||
      !!this.priorityFilter() ||
      this.projectFilter() !== null ||
      this.assigneeFilter() !== null ||
      this.overdueOnly(),
  );

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.search.set(value);
        this.page.set(1);
        this.reload();
      });

    this.loadFilterOptions();

    const projectId = Number(this.route.snapshot.queryParamMap.get('projectId'));
    if (Number.isInteger(projectId) && projectId > 0) {
      this.projectFilter.set(projectId);
    }

    this.reload();
  }

  protected initials(name: string): string {
    return toInitials(name);
  }

  protected onSearchInput(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value);
  }

  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as TaskStatus | '');
    this.page.set(1);
    this.reload();
  }

  protected onPriorityFilter(event: Event): void {
    this.priorityFilter.set((event.target as HTMLSelectElement).value as TaskPriority | '');
    this.page.set(1);
    this.reload();
  }

  protected onProjectFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.projectFilter.set(value ? Number(value) : null);
    this.page.set(1);
    this.reload();
  }

  protected onAssigneeFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.assigneeFilter.set(value ? Number(value) : null);
    this.page.set(1);
    this.reload();
  }

  protected onOverdueToggle(event: Event): void {
    this.overdueOnly.set((event.target as HTMLInputElement).checked);
    this.page.set(1);
    this.reload();
  }

  protected onSortBy(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as TaskSortField);
    this.page.set(1);
    this.reload();
  }

  protected toggleDirection(): void {
    this.sortDescending.update((value) => !value);
    this.page.set(1);
    this.reload();
  }

  protected sort(field: TaskSortField): void {
    if (this.sortBy() === field) {
      return this.toggleDirection();
    }
    this.sortBy.set(field);
    this.sortDescending.set(false);
    this.page.set(1);
    this.reload();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.priorityFilter.set('');
    this.projectFilter.set(null);
    this.assigneeFilter.set(null);
    this.overdueOnly.set(false);
    this.page.set(1);
    this.reload();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.reload();
  }

  protected openTask(task: TaskItem): void {
    void this.router.navigate(['/tasks', task.id]);
  }

  protected async createTask(): Promise<void> {
    const created = await this.taskForm().open(null);
    if (created) {
      this.page.set(1);
      this.reload();
    }
  }

  protected async editTask(task: TaskItem): Promise<void> {
    const updated = await this.taskForm().open(task);
    if (updated) {
      this.reload();
    }
  }

  protected async removeTask(task: TaskItem): Promise<void> {
    const confirmed = await this.confirm().open({
      title: 'Delete task',
      message: `"${task.title}" and all of its comments and attachments will be permanently deleted.`,
      confirmLabel: 'Delete task',
    });
    if (!confirmed) {
      return;
    }

    this.tasks.remove(task.id).subscribe({
      next: () => {
        this.toast.success(`"${task.title}" was deleted.`, 'Task deleted');
        const result = this.paged();
        if (result && result.items.length === 1 && this.page() > 1) {
          this.page.update((page) => page - 1);
        }
        this.reload();
      },
      error: (err: unknown) => this.toast.error(errorMessage(err, 'Could not delete the task.')),
    });
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.tasks
      .query({
        search: this.search().trim() || null,
        status: this.statusFilter() || null,
        priority: this.priorityFilter() || null,
        projectId: this.projectFilter(),
        assigneeId: this.assigneeFilter(),
        isOverdue: this.overdueOnly() ? true : null,
        sortBy: this.sortBy(),
        sortDescending: this.sortDescending(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (result) => {
          this.paged.set(result);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(errorMessage(err, 'Could not load tasks.'));
          this.loading.set(false);
        },
      });
  }

  private loadFilterOptions(): void {
    forkJoin({
      projects: this.projectsApi.list(true),
      users: this.usersApi.lookups(),
    }).subscribe({
      next: ({ projects, users }) => {
        this.projects.set(projects);
        this.users.set(users);
      },
      error: () => {
        /* filters stay empty; the list itself still loads */
      },
    });
  }
}
