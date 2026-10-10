import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Project } from '@core/models';
import { errorMessage } from '@core/errors/api-error';
import { AuthService } from '@core/services/auth.service';
import { ProjectService } from '@core/services/project.service';
import { ToastService } from '@core/services/toast.service';

import { AppIcon } from '@shared/components/app-icon';
import { ConfirmDialog } from '@shared/components/confirm-dialog';
import { EmptyState } from '@shared/components/empty-state';
import { LoadingSpinner } from '@shared/components/loading-spinner';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';

import { ProjectFormDialog } from './project-form-dialog';

@Component({
  selector: 'app-projects-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AppIcon,
    ConfirmDialog,
    EmptyState,
    LoadingSpinner,
    RelativeDatePipe,
    ProjectFormDialog,
  ],
  template: `
    <header class="page-head">
      <div>
        <h1 class="page-title">Projects</h1>
        <p class="page-subtitle">Group tasks into colour-coded projects and track progress.</p>
      </div>
      <div class="row gap-12 wrap">
        <label class="switch">
          <input
            type="checkbox"
            [checked]="includeArchived()"
            (change)="onToggleArchived($event)"
          />
          <span class="switch-text">Show archived</span>
        </label>
        <button type="button" class="btn btn-primary" (click)="createProject()">
          <app-icon name="plus" [size]="15" />
          New project
        </button>
      </div>
    </header>

    @if (loading()) {
      <app-loading-spinner label="Loading projects…" />
    } @else if (error(); as message) {
      <div class="card card-pad">
        <div class="form-error">
          <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
          <span class="flex-1">{{ message }}</span>
        </div>
        <button type="button" class="btn mt-16" (click)="reload()">Try again</button>
      </div>
    } @else if (projects().length) {
      <div class="grid grid-auto">
        @for (project of projects(); track project.id) {
          <article class="card project-card" [class.archived]="project.isArchived">
            <span class="accent" [style.background]="project.color"></span>

            <div class="project-body">
              <div class="row-between gap-8">
                <h2 class="project-name truncate" [attr.title]="project.name">
                  {{ project.name }}
                </h2>
                @if (project.isArchived) {
                  <span class="tag">Archived</span>
                }
              </div>

              @if (project.description) {
                <p class="project-desc">{{ project.description }}</p>
              } @else {
                <p class="project-desc text-subtle">No description.</p>
              }

              <div class="project-meta">
                <span class="chip">
                  <app-icon name="user" [size]="12" />
                  {{ project.ownerName }}
                </span>
                <span class="chip">
                  <app-icon name="tasks" [size]="12" />
                  {{ project.openTaskCount }} open / {{ project.taskCount }} total
                </span>
              </div>

              <div class="project-foot">
                <a
                  class="btn btn-sm btn-outline-primary"
                  routerLink="/tasks"
                  [queryParams]="{ projectId: project.id }"
                >
                  <app-icon name="list" [size]="14" />
                  View tasks
                </a>
                <span class="text-subtle text-xs nowrap">
                  Created {{ project.createdAt | relativeDate: 'past' }}
                </span>
                <span class="flex-1"></span>
                <span class="row gap-2">
                  <button
                    type="button"
                    class="btn btn-ghost btn-icon btn-sm"
                    title="Edit project"
                    (click)="editProject(project)"
                  >
                    <app-icon name="edit" [size]="14" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-icon btn-sm"
                    [title]="project.isArchived ? 'Restore project' : 'Archive project'"
                    (click)="toggleArchive(project)"
                  >
                    <app-icon [name]="project.isArchived ? 'refresh' : 'archive'" [size]="14" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-icon btn-sm delete"
                    title="Delete project"
                    (click)="removeProject(project)"
                  >
                    <app-icon name="x" [size]="14" />
                  </button>
                </span>
              </div>
            </div>
          </article>
        }
      </div>
    } @else {
      <div class="card">
        <app-empty-state
          icon="folder"
          title="No projects yet"
          message="Create a project to group related tasks together."
        >
          <button type="button" class="btn btn-primary" (click)="createProject()">
            <app-icon name="plus" [size]="15" />
            New project
          </button>
        </app-empty-state>
      </div>
    }

    <app-project-form-dialog #projectForm />
    <app-confirm-dialog #confirm />
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .project-card {
        position: relative;
        overflow: hidden;
        display: flex;
      }
      .project-card.archived {
        opacity: 0.72;
      }
      .accent {
        width: 4px;
        align-self: stretch;
        flex: none;
      }
      .project-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 16px 18px;
      }
      .project-name {
        font-size: 15px;
        font-weight: 650;
        letter-spacing: -0.01em;
      }
      .project-desc {
        font-size: 13px;
        line-height: 1.55;
        color: var(--text-muted);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 40px;
      }
      .project-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .project-foot {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: auto;
        padding-top: 12px;
        border-top: 1px solid var(--border-soft);
      }
      .delete:hover {
        color: var(--danger);
      }
    `,
  ],
})
export class ProjectsPage {
  private readonly projectsApi = inject(ProjectService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  private readonly projectForm = viewChild.required<ProjectFormDialog>('projectForm');
  private readonly confirm = viewChild.required<ConfirmDialog>('confirm');

  protected readonly projects = signal<Project[]>([]);
  protected readonly includeArchived = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  protected onToggleArchived(event: Event): void {
    this.includeArchived.set((event.target as HTMLInputElement).checked);
    this.reload();
  }

  protected async createProject(): Promise<void> {
    const created = await this.projectForm().open(null);
    if (created) {
      this.reload();
    }
  }

  protected async editProject(project: Project): Promise<void> {
    const updated = await this.projectForm().open(project);
    if (updated) {
      this.reload();
    }
  }

  protected toggleArchive(project: Project): void {
    const payload = {
      name: project.name,
      description: project.description,
      color: project.color,
      isArchived: !project.isArchived,
      ...(this.auth.isAdmin() ? { ownerId: project.ownerId } : {}),
    };
    this.projectsApi.update(project.id, payload).subscribe({
      next: (saved) => {
        this.toast.success(
          saved.isArchived ? `"${saved.name}" was archived.` : `"${saved.name}" was restored.`,
          saved.isArchived ? 'Project archived' : 'Project restored',
        );
        this.reload();
      },
      error: (err: unknown) =>
        this.toast.error(errorMessage(err, 'Could not update the project.')),
    });
  }

  protected async removeProject(project: Project): Promise<void> {
    const confirmed = await this.confirm().open({
      title: 'Delete project',
      message:
        project.taskCount > 0
          ? `"${project.name}" has ${project.taskCount} task(s). Tasks are kept but will no longer belong to a project.`
          : `"${project.name}" will be permanently deleted.`,
      confirmLabel: 'Delete project',
    });
    if (!confirmed) {
      return;
    }

    this.projectsApi.remove(project.id).subscribe({
      next: () => {
        this.toast.success(`"${project.name}" was deleted.`, 'Project deleted');
        this.reload();
      },
      error: (err: unknown) =>
        this.toast.error(errorMessage(err, 'Could not delete the project.')),
    });
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.projectsApi.list(this.includeArchived()).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err, 'Could not load projects.'));
        this.loading.set(false);
      },
    });
  }
}
