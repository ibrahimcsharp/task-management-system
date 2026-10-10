import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  CreateTaskRequest,
  Project,
  TASK_PRIORITIES,
  TASK_STATUSES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TaskItem,
  TaskPriority,
  TaskStatus,
  UserLookup,
} from '@core/models';
import { applyApiErrors, markAllTouched } from '@core/errors/form-errors';
import { errorMessage } from '@core/errors/api-error';
import { ProjectService } from '@core/services/project.service';
import { TaskService } from '@core/services/task.service';
import { ToastService } from '@core/services/toast.service';
import { UserService } from '@core/services/user.service';

import { toDateInputValue, toIsoDate } from '@shared/utils/format';

import { AppIcon } from '@shared/components/app-icon';
import { FieldErrors } from '@shared/components/field-errors';

/**
 * Modal used for both creating and editing a task.
 *
 * ```ts
 * const created = await this.taskForm().open(null);        // create
 * const updated = await this.taskForm().open(task);        // edit
 * ```
 * Resolves with the saved task, or `null` when cancelled.
 */
@Component({
  selector: 'app-task-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppIcon, FieldErrors],
  template: `
    <dialog #dialogEl class="dialog" (close)="onClose()">
      <form class="dialog-body" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="dialog-head">
          <span class="dialog-icon dialog-icon-primary">
            <app-icon name="tasks" [size]="19" [strokeWidth]="2" />
          </span>
          <div class="flex-1">
            <h3>{{ editing() ? 'Edit task' : 'New task' }}</h3>
            <p class="text-muted text-sm">
              {{ editing() ? 'Update the details and save your changes.' : 'Fill in the details to create a new task.' }}
            </p>
          </div>
          <button type="button" class="dialog-close" (click)="close()" aria-label="Close">
            <app-icon name="x" [size]="16" [strokeWidth]="2.2" />
          </button>
        </div>

        @if (formError(); as message) {
          <div class="form-error mt-16">
            <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
            <span>{{ message }}</span>
          </div>
        }

        <div class="form-grid mt-16">
          <div class="field span-2">
            <label for="task-title">Title <span class="req">*</span></label>
            <input
              id="task-title"
              class="input"
              type="text"
              formControlName="title"
              placeholder="e.g. Draft the Q3 launch checklist"
            />
            <app-field-errors [control]="form.controls.title" />
          </div>

          <div class="field span-2">
            <label for="task-description">Description</label>
            <textarea
              id="task-description"
              class="textarea"
              rows="4"
              formControlName="description"
              placeholder="Add context, acceptance criteria or links…"
            ></textarea>
            <app-field-errors [control]="form.controls.description" />
          </div>

          <div class="field">
            <label for="task-status">Status</label>
            <select id="task-status" class="select" formControlName="status">
              @for (status of statuses; track status) {
                <option [value]="status">{{ statusLabels[status] }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label for="task-priority">Priority</label>
            <select id="task-priority" class="select" formControlName="priority">
              @for (priority of priorities; track priority) {
                <option [value]="priority">{{ priorityLabels[priority] }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label for="task-due">Due date</label>
            <input id="task-due" class="input" type="date" formControlName="dueDate" />
          </div>

          <div class="field">
            <label for="task-project">Project</label>
            <select id="task-project" class="select" formControlName="projectId">
              <option [ngValue]="null">No project</option>
              @for (project of projects(); track project.id) {
                <option [ngValue]="project.id">{{ project.name }}</option>
              }
            </select>
            @if (optionsLoaded() && projects().length === 0) {
              <span class="hint">No projects yet — create one from the Projects page.</span>
            }
          </div>

          <div class="field span-2">
            <label for="task-assignee">Assignee</label>
            <select id="task-assignee" class="select" formControlName="assigneeId">
              <option [ngValue]="null">Unassigned</option>
              @for (user of users(); track user.id) {
                <option [ngValue]="user.id">{{ user.fullName }} ({{ user.userName }})</option>
              }
            </select>
          </div>
        </div>

        <div class="dialog-foot">
          <button type="button" class="btn" (click)="close()" [disabled]="saving()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner spinner-light" style="width: 14px; height: 14px;"></span>
            }
            {{ editing() ? 'Save changes' : 'Create task' }}
          </button>
        </div>
      </form>
    </dialog>
  `,
  styles: [
    `
      .dialog-icon-primary {
        background: var(--primary-soft);
        color: var(--primary);
      }
    `,
  ],
})
export class TaskFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly tasks = inject(TaskService);
  private readonly projectsApi = inject(ProjectService);
  private readonly usersApi = inject(UserService);
  private readonly toast = inject(ToastService);

  private readonly dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');
  private resolver: ((value: TaskItem | null) => void) | null = null;
  private optionsLoadedFlag = false;

  protected readonly statuses = TASK_STATUSES;
  protected readonly priorities = TASK_PRIORITIES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected readonly editing = signal<TaskItem | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly projects = signal<Project[]>([]);
  protected readonly users = signal<UserLookup[]>([]);
  protected readonly optionsLoaded = signal(false);

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(4000)]],
    status: ['NotStarted' as TaskStatus, [Validators.required]],
    priority: ['Medium' as TaskPriority, [Validators.required]],
    dueDate: [''],
    projectId: [null as number | null],
    assigneeId: [null as number | null],
  });

  open(task: TaskItem | null): Promise<TaskItem | null> {
    this.settle(null);
    this.editing.set(task);
    this.saving.set(false);
    this.formError.set(null);
    this.form.reset({
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'NotStarted',
      priority: task?.priority ?? 'Medium',
      dueDate: toDateInputValue(task?.dueDate ?? null),
      projectId: task?.projectId ?? null,
      assigneeId: task?.assigneeId ?? null,
    });

    this.loadOptions();

    const element = this.dialogEl().nativeElement;
    if (!element.open) {
      element.showModal();
    }

    return new Promise<TaskItem | null>((resolve) => {
      this.resolver = resolve;
    });
  }

  protected close(): void {
    this.dialogEl().nativeElement.close();
  }

  protected onClose(): void {
    this.settle(this.lastSaved);
    this.lastSaved = null;
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      markAllTouched(this.form);
      return;
    }

    const value = this.form.getRawValue();
    const description = (value.description ?? '').trim();
    const payload: CreateTaskRequest = {
      title: (value.title ?? '').trim(),
      description: description ? description : null,
      status: (value.status ?? 'NotStarted') as TaskStatus,
      priority: (value.priority ?? 'Medium') as TaskPriority,
      dueDate: toIsoDate(value.dueDate),
      projectId: value.projectId ?? null,
      assigneeId: value.assigneeId ?? null,
    };

    const editing = this.editing();
    const existingId = editing?.id ?? null;

    this.saving.set(true);
    this.formError.set(null);

    const request$ = existingId
      ? this.tasks.update(existingId, payload)
      : this.tasks.create(payload);

    request$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(
          existingId ? `"${saved.title}" was updated.` : `"${saved.title}" was created.`,
          existingId ? 'Task updated' : 'Task created',
        );
        this.lastSaved = saved;
        this.close();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const applied = applyApiErrors(this.form, err);
        if (applied.unmatchedMessages.length) {
          this.formError.set(applied.unmatchedMessages.join(' '));
        } else if (applied.matched.length === 0) {
          this.formError.set(errorMessage(err, 'Could not save the task.'));
        }
      },
    });
  }

  private lastSaved: TaskItem | null = null;

  private loadOptions(): void {
    if (this.optionsLoadedFlag) {
      return;
    }
    forkJoin({
      projects: this.projectsApi.list(false),
      users: this.usersApi.lookups(),
    }).subscribe({
      next: ({ projects, users }) => {
        this.projects.set(projects);
        this.users.set(users);
        this.optionsLoadedFlag = true;
        this.optionsLoaded.set(true);
      },
      error: () => {
        this.optionsLoaded.set(true);
      },
    });
  }

  private settle(value: TaskItem | null): void {
    const resolve = this.resolver;
    this.resolver = null;
    resolve?.(value);
  }
}
