import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreateProjectRequest, PROJECT_COLORS, Project, UserLookup } from '@core/models';
import { applyApiErrors, markAllTouched } from '@core/errors/form-errors';
import { errorMessage } from '@core/errors/api-error';
import { AuthService } from '@core/services/auth.service';
import { ProjectService } from '@core/services/project.service';
import { ToastService } from '@core/services/toast.service';
import { UserService } from '@core/services/user.service';

import { AppIcon } from '@shared/components/app-icon';
import { FieldErrors } from '@shared/components/field-errors';

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

/**
 * Modal for creating and editing projects.
 *
 * ```ts
 * const created = await this.projectForm().open(null);
 * const updated = await this.projectForm().open(project);
 * ```
 * Resolves with the saved project, or `null` when cancelled.
 */
@Component({
  selector: 'app-project-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppIcon, FieldErrors],
  template: `
    <dialog #dialogEl class="dialog" (close)="onClose()">
      <form class="dialog-body" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="dialog-head">
          <span class="dialog-icon dialog-icon-primary">
            <app-icon name="folder" [size]="19" [strokeWidth]="2" />
          </span>
          <div class="flex-1">
            <h3>{{ editing() ? 'Edit project' : 'New project' }}</h3>
            <p class="text-muted text-sm">
              {{ editing() ? 'Update the project details below.' : 'Group related tasks under a project.' }}
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
            <label for="project-name">Name <span class="req">*</span></label>
            <input
              id="project-name"
              class="input"
              type="text"
              formControlName="name"
              placeholder="e.g. Website Redesign"
            />
            <app-field-errors [control]="form.controls.name" />
          </div>

          <div class="field span-2">
            <label for="project-description">Description</label>
            <textarea
              id="project-description"
              class="textarea"
              rows="3"
              formControlName="description"
              placeholder="What is this project about?"
            ></textarea>
            <app-field-errors [control]="form.controls.description" />
          </div>

          <div class="field span-2">
            <label>Colour</label>
            <div class="swatches">
              @for (color of palette; track color) {
                <button
                  type="button"
                  class="swatch"
                  [style.background]="color"
                  [attr.aria-pressed]="form.controls.color.value === color"
                  [attr.aria-label]="'Use colour ' + color"
                  (click)="form.controls.color.setValue(color)"
                ></button>
              }
              <input
                type="color"
                class="color-native"
                [value]="form.controls.color.value"
                (input)="onColorInput($event)"
                aria-label="Custom colour"
              />
            </div>
            <app-field-errors [control]="form.controls.color" />
          </div>

          @if (auth.isAdmin()) {
            <div class="field">
              <label for="project-owner">Owner</label>
              <select id="project-owner" class="select" formControlName="ownerId">
                <option [ngValue]="null">Assign to me (default)</option>
                @for (user of users(); track user.id) {
                  <option [ngValue]="user.id">{{ user.fullName }} ({{ user.userName }})</option>
                }
              </select>
            </div>
          }

          @if (editing()) {
            <div class="field">
              <label>Visibility</label>
              <label class="switch">
                <input type="checkbox" formControlName="isArchived" />
                <span class="switch-text">Archived (hidden from active lists)</span>
              </label>
            </div>
          }
        </div>

        <div class="dialog-foot">
          <button type="button" class="btn" (click)="close()" [disabled]="saving()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner spinner-light" style="width: 14px; height: 14px;"></span>
            }
            {{ editing() ? 'Save changes' : 'Create project' }}
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
export class ProjectFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly projectsApi = inject(ProjectService);
  private readonly usersApi = inject(UserService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  private readonly dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');
  private resolver: ((value: Project | null) => void) | null = null;
  private lastSaved: Project | null = null;
  private optionsLoadedFlag = false;

  protected readonly palette = PROJECT_COLORS;
  protected readonly editing = signal<Project | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly users = signal<UserLookup[]>([]);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(1000)]],
    color: [PROJECT_COLORS[0], [Validators.required, Validators.pattern(HEX_COLOR)]],
    ownerId: [null as number | null],
    isArchived: [false],
  });

  open(project: Project | null): Promise<Project | null> {
    this.settle(null);
    this.editing.set(project);
    this.saving.set(false);
    this.formError.set(null);
    this.form.reset({
      name: project?.name ?? '',
      description: project?.description ?? '',
      color: project?.color ?? PROJECT_COLORS[0],
      ownerId: project?.ownerId ?? null,
      isArchived: project?.isArchived ?? false,
    });

    if (this.auth.isAdmin()) {
      this.loadUsers();
    }

    const element = this.dialogEl().nativeElement;
    if (!element.open) {
      element.showModal();
    }

    return new Promise<Project | null>((resolve) => {
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

  protected onColorInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.controls.color.setValue(value.toUpperCase());
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
    const editing = this.editing();

    this.saving.set(true);
    this.formError.set(null);

    if (editing) {
      const payload = {
        name: (value.name ?? '').trim(),
        description: description ? description : null,
        color: (value.color ?? PROJECT_COLORS[0]).toUpperCase(),
        isArchived: !!value.isArchived,
        ...(this.auth.isAdmin() ? { ownerId: value.ownerId ?? null } : {}),
      };
      this.projectsApi.update(editing.id, payload).subscribe({
        next: (saved) => this.finish(saved, 'Project updated'),
        error: (err: unknown) => this.fail(err),
      });
      return;
    }

    const payload: CreateProjectRequest = {
      name: (value.name ?? '').trim(),
      description: description ? description : null,
      color: (value.color ?? PROJECT_COLORS[0]).toUpperCase(),
      ...(this.auth.isAdmin() ? { ownerId: value.ownerId ?? null } : {}),
    };
    this.projectsApi.create(payload).subscribe({
      next: (saved) => this.finish(saved, 'Project created'),
      error: (err: unknown) => this.fail(err),
    });
  }

  private finish(saved: Project, title: string): void {
    this.saving.set(false);
    this.toast.success(`"${saved.name}" was saved.`, title);
    this.lastSaved = saved;
    this.close();
  }

  private fail(err: unknown): void {
    this.saving.set(false);
    const applied = applyApiErrors(this.form, err);
    if (applied.unmatchedMessages.length) {
      this.formError.set(applied.unmatchedMessages.join(' '));
    } else if (applied.matched.length === 0) {
      this.formError.set(errorMessage(err, 'Could not save the project.'));
    }
  }

  private loadUsers(): void {
    if (this.optionsLoadedFlag) {
      return;
    }
    this.usersApi.lookups().subscribe({
      next: (users) => {
        this.users.set(users);
        this.optionsLoadedFlag = true;
      },
      error: () => undefined,
    });
  }

  private settle(value: Project | null): void {
    const resolve = this.resolver;
    this.resolver = null;
    resolve?.(value);
  }
}
