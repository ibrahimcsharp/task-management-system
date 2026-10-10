import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import {
  Attachment,
  Comment,
  STATUS_LABELS,
  TASK_STATUSES,
  TaskItem,
  TaskStatus,
} from '@core/models';
import { errorMessage, errorStatusOf } from '@core/errors/api-error';
import { AttachmentService } from '@core/services/attachment.service';
import { AuthService } from '@core/services/auth.service';
import { CommentService } from '@core/services/comment.service';
import { TaskService } from '@core/services/task.service';
import { ToastService } from '@core/services/toast.service';

import { AppIcon } from '@shared/components/app-icon';
import { ConfirmDialog } from '@shared/components/confirm-dialog';
import { EmptyState } from '@shared/components/empty-state';
import { LoadingSpinner } from '@shared/components/loading-spinner';
import { PriorityBadge } from '@shared/components/priority-badge';
import { StatusBadge } from '@shared/components/status-badge';
import { FileSizePipe } from '@shared/pipes/file-size.pipe';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';
import { formatDateTime, saveBlob, toInitials } from '@shared/utils/format';

import { TaskFormDialog } from './task-form-dialog';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-task-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AppIcon,
    ConfirmDialog,
    EmptyState,
    LoadingSpinner,
    PriorityBadge,
    StatusBadge,
    FileSizePipe,
    RelativeDatePipe,
    TaskFormDialog,
  ],
  template: `
    <a class="btn btn-ghost btn-sm back-link" routerLink="/tasks">
      <app-icon name="arrowLeft" [size]="15" />
      All tasks
    </a>

    @if (loading()) {
      <app-loading-spinner label="Loading task…" />
    } @else if (notFound()) {
      <div class="card">
        <app-empty-state
          icon="alertCircle"
          title="Task not found"
          message="This task may have been deleted, or you do not have access to it."
        >
          <a class="btn btn-primary" routerLink="/tasks">Back to tasks</a>
        </app-empty-state>
      </div>
    } @else if (error(); as message) {
      <div class="card card-pad">
        <div class="form-error">
          <app-icon name="alertCircle" [size]="16" [strokeWidth]="2" />
          <span class="flex-1">{{ message }}</span>
        </div>
        <button type="button" class="btn mt-16" (click)="reload()">Try again</button>
      </div>
    } @else if (task(); as t) {
      <section class="card card-pad task-head">
        <div class="head-main">
          <div class="row gap-8 wrap mb-8">
            <app-status-badge [status]="t.status" />
            <app-priority-badge [priority]="t.priority" />
            @if (t.isOverdue) {
              <span class="badge badge-plain overdue-badge">
                <app-icon name="alertTriangle" [size]="13" [strokeWidth]="2.2" />
                Overdue
              </span>
            }
            @if (t.projectName; as projectName) {
              <span class="chip">
                <span
                  class="proj-dot"
                  [style.background]="t.projectColor || 'var(--text-subtle)'"
                ></span>
                {{ projectName }}
              </span>
            }
          </div>

          <h1 class="page-title">{{ t.title }}</h1>

          <div class="head-meta">
            <span class="meta-item">
              <app-icon name="user" [size]="13" />
              {{ t.assigneeName ?? 'Unassigned' }}
            </span>
            <span class="meta-item">
              <app-icon name="atSign" [size]="13" />
              Created by {{ t.createdByName }}
            </span>
            <span class="meta-item">
              <app-icon name="clock" [size]="13" />
              Created {{ t.createdAt | relativeDate: 'past' }}
            </span>
            @if (t.updatedAt) {
              <span class="meta-item">
                <app-icon name="refresh" [size]="13" />
                Updated {{ t.updatedAt | relativeDate: 'past' }}
              </span>
            }
            @if (t.completedAt) {
              <span class="meta-item text-success">
                <app-icon name="checkCircle" [size]="13" />
                Completed {{ t.completedAt | relativeDate: 'past' }}
              </span>
            }
          </div>
        </div>

        <div class="head-actions">
          <button type="button" class="btn" (click)="editTask()">
            <app-icon name="edit" [size]="15" />
            Edit
          </button>
          <button type="button" class="btn btn-danger" (click)="removeTask()">
            <app-icon name="x" [size]="15" />
            Delete
          </button>
        </div>
      </section>

      <section class="card card-pad mt-16">
        <div class="row-between wrap gap-12">
          <h2 class="section-title">Status</h2>
          @if (savingStatus()) {
            <span class="text-muted text-xs">Saving…</span>
          }
        </div>
        <div class="segmented mt-8">
          @for (status of statuses; track status) {
            <button
              type="button"
              class="seg"
              [class.active]="t.status === status"
              [disabled]="savingStatus()"
              (click)="changeStatus(status)"
            >
              {{ statusLabels[status] }}
            </button>
          }
        </div>
      </section>

      <div class="detail-grid mt-16">
        <div class="stack gap-16">
          <section class="card">
            <div class="card-head">
              <h2 class="section-title">Description</h2>
              <button type="button" class="btn btn-ghost btn-sm" (click)="editTask()">
                <app-icon name="edit" [size]="14" />
                Edit
              </button>
            </div>
            <div class="card-body">
              @if (t.description) {
                <p class="pre-wrap description">{{ t.description }}</p>
              } @else {
                <p class="text-subtle">No description yet — use Edit to add one.</p>
              }
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <h2 class="section-title">Comments</h2>
              <span class="chip">{{ comments().length }}</span>
            </div>

            <div class="card-body stack gap-16">
              @if (comments().length) {
                @for (comment of comments(); track comment.id) {
                  <article class="comment">
                    <span class="avatar avatar-sm">{{ initials(comment.authorName) }}</span>
                    <div class="comment-main">
                      <div class="comment-head">
                        <span class="comment-author">{{ comment.authorName }}</span>
                        <span class="comment-date text-muted text-xs">
                          {{ comment.createdAt | relativeDate: 'past' }}
                          @if (comment.updatedAt) {
                            · edited
                          }
                        </span>
                        @if (canManage(comment)) {
                          <span class="comment-actions">
                            <button
                              type="button"
                              class="btn btn-ghost btn-icon btn-sm"
                              title="Edit comment"
                              (click)="startEdit(comment)"
                            >
                              <app-icon name="edit" [size]="13" />
                            </button>
                            <button
                              type="button"
                              class="btn btn-ghost btn-icon btn-sm delete"
                              title="Delete comment"
                              (click)="removeComment(comment)"
                            >
                              <app-icon name="x" [size]="13" />
                            </button>
                          </span>
                        }
                      </div>

                      @if (editingId() === comment.id) {
                        <div class="stack gap-8 mt-8">
                          <textarea
                            class="textarea"
                            rows="3"
                            [value]="editingBody()"
                            (input)="onEditInput($event)"
                          ></textarea>
                          <div class="row gap-8 justify-end">
                            <button type="button" class="btn btn-sm" (click)="cancelEdit()">
                              Cancel
                            </button>
                            <button
                              type="button"
                              class="btn btn-sm btn-primary"
                              [disabled]="savingComment()"
                              (click)="saveEdit(comment)"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      } @else {
                        <p class="pre-wrap comment-body">{{ comment.body }}</p>
                      }
                    </div>
                  </article>
                }
              } @else {
                <p class="text-subtle">No comments yet — start the discussion below.</p>
              }

              <div class="comment-form">
                <span class="avatar avatar-sm">{{ auth.initials() }}</span>
                <div class="comment-main stack gap-8">
                  <textarea
                    class="textarea"
                    rows="3"
                    placeholder="Write a comment…"
                    [value]="newComment()"
                    (input)="onNewCommentInput($event)"
                  ></textarea>
                  <div class="row justify-end">
                    <button
                      type="button"
                      class="btn btn-sm btn-primary"
                      [disabled]="posting() || !newComment().trim()"
                      (click)="addComment()"
                    >
                      @if (posting()) {
                        <span class="spinner spinner-light" style="width: 13px; height: 13px;"></span>
                      } @else {
                        <app-icon name="send" [size]="14" />
                      }
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="stack gap-16">
          <section class="card">
            <div class="card-head">
              <h2 class="section-title">Details</h2>
            </div>
            <div class="card-body stack gap-12">
              <div class="detail-row">
                <span class="detail-label">Due date</span>
                <span class="detail-value" [class.text-danger]="t.isOverdue">
                  {{ t.dueDate ? formatDateTime(t.dueDate) : 'No due date' }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Project</span>
                <span class="detail-value">{{ t.projectName ?? '—' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Assignee</span>
                <span class="detail-value">{{ t.assigneeName ?? 'Unassigned' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Created by</span>
                <span class="detail-value">{{ t.createdByName }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Created</span>
                <span class="detail-value">{{ formatDateTime(t.createdAt) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Last updated</span>
                <span class="detail-value">
                  {{ t.updatedAt ? formatDateTime(t.updatedAt) : '—' }}
                </span>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <h2 class="section-title">Attachments</h2>
              <button
                type="button"
                class="btn btn-sm"
                [disabled]="uploading()"
                (click)="pickFile()"
              >
                @if (uploading()) {
                  <span class="spinner" style="width: 13px; height: 13px;"></span>
                } @else {
                  <app-icon name="upload" [size]="14" />
                }
                Upload
              </button>
              <input
                #fileInput
                type="file"
                class="sr-only"
                (change)="onFileSelected($event)"
              />
            </div>

            <div class="card-body">
              @if (attachments().length) {
                <ul class="attachments stack gap-8">
                  @for (file of attachments(); track file.id) {
                    <li class="attachment">
                      <span class="attachment-icon">
                        <app-icon name="file" [size]="16" />
                      </span>
                      <span class="attachment-main">
                        <span class="attachment-name truncate" [attr.title]="file.fileName">
                          {{ file.fileName }}
                        </span>
                        <span class="attachment-meta text-muted text-xs">
                          {{ file.sizeBytes | fileSize }} · {{ file.uploadedByName }} ·
                          {{ file.createdAt | relativeDate: 'past' }}
                        </span>
                      </span>
                      <span class="row gap-4">
                        <button
                          type="button"
                          class="btn btn-ghost btn-icon btn-sm"
                          title="Download"
                          (click)="download(file)"
                        >
                          <app-icon name="download" [size]="14" />
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-icon btn-sm delete"
                          title="Delete attachment"
                          (click)="removeAttachment(file)"
                        >
                          <app-icon name="x" [size]="14" />
                        </button>
                      </span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="text-subtle">
                  No attachments yet. Files up to 10 MB can be uploaded here.
                </p>
              }
            </div>
          </section>
        </div>
      </div>
    }

    <app-task-form-dialog #taskForm />
    <app-confirm-dialog #confirm />
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .back-link {
        margin-bottom: 12px;
      }

      .task-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
      }
      .head-main {
        min-width: 0;
        flex: 1 1 420px;
      }
      .head-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .head-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        margin-top: 12px;
        font-size: 12.5px;
        color: var(--text-muted);
      }
      .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .overdue-badge {
        color: var(--danger);
      }
      .proj-dot {
        width: 8px;
        height: 8px;
        flex: none;
        border-radius: 50%;
      }

      .segmented {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .seg {
        padding: 6px 13px;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--surface);
        color: var(--text-muted);
        font-size: 12.5px;
        font-weight: 550;
        cursor: pointer;
        transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease),
          border-color var(--t-fast) var(--ease);
      }
      .seg:hover:not(:disabled):not(.active) {
        border-color: var(--border-strong);
        color: var(--text);
      }
      .seg.active {
        background: var(--primary);
        border-color: var(--primary);
        color: #fff;
      }
      .seg:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 16px;
        align-items: start;
      }
      @media (max-width: 1080px) {
        .detail-grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      .description {
        font-size: 13.5px;
        line-height: 1.65;
        color: var(--text-secondary);
      }

      .comment {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      .comment-form {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding-top: 14px;
        border-top: 1px solid var(--border-soft);
      }
      .comment-main {
        flex: 1;
        min-width: 0;
      }
      .comment-head {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .comment-author {
        font-size: 13px;
        font-weight: 620;
      }
      .comment-actions {
        margin-left: auto;
        display: inline-flex;
        gap: 2px;
        opacity: 0;
        transition: opacity var(--t-fast) var(--ease);
      }
      .comment:hover .comment-actions {
        opacity: 1;
      }
      .comment-body {
        margin-top: 4px;
        font-size: 13.5px;
        line-height: 1.6;
        color: var(--text-secondary);
      }
      .justify-end {
        justify-content: flex-end;
      }
      .delete:hover {
        color: var(--danger);
      }

      .attachments {
        min-width: 0;
      }
      .attachment {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: 1px solid var(--border-soft);
        border-radius: var(--radius-sm);
        background: var(--surface-muted);
      }
      .attachment-icon {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        flex: none;
        border-radius: var(--radius-xs);
        background: var(--primary-soft);
        color: var(--primary);
      }
      .attachment-main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .attachment-name {
        font-size: 13px;
        font-weight: 550;
      }

      .detail-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
      }
      .detail-label {
        color: var(--text-muted);
        flex: none;
      }
      .detail-value {
        text-align: right;
        font-weight: 550;
        color: var(--text-secondary);
        min-width: 0;
        word-break: break-word;
      }
    `,
  ],
})
export class TaskDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasks = inject(TaskService);
  private readonly commentsApi = inject(CommentService);
  private readonly attachmentsApi = inject(AttachmentService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  private readonly taskForm = viewChild.required<TaskFormDialog>('taskForm');
  private readonly confirm = viewChild.required<ConfirmDialog>('confirm');
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly statuses = TASK_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly task = signal<TaskItem | null>(null);
  protected readonly comments = signal<Comment[]>([]);
  protected readonly attachments = signal<Attachment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notFound = signal(false);

  protected readonly savingStatus = signal(false);
  protected readonly uploading = signal(false);

  protected readonly newComment = signal('');
  protected readonly posting = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly editingBody = signal('');
  protected readonly savingComment = signal(false);

  protected readonly formatDateTime = formatDateTime;

  private taskId: number | null = null;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }
      this.taskId = id;
      this.reload();
    });
  }

  protected initials(name: string): string {
    return toInitials(name);
  }

  protected canManage(comment: Comment): boolean {
    return this.auth.isAdmin() || comment.authorId === this.auth.userId();
  }

  protected reload(): void {
    const id = this.taskId;
    if (id === null) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);

    forkJoin({
      task: this.tasks.get(id),
      comments: this.commentsApi.list(id),
      attachments: this.attachmentsApi.list(id),
    }).subscribe({
      next: ({ task, comments, attachments }) => {
        this.task.set(task);
        this.comments.set(comments);
        this.attachments.set(attachments);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        if (errorStatusOf(err) === 404) {
          this.notFound.set(true);
        } else {
          this.error.set(errorMessage(err, 'Could not load this task.'));
        }
        this.loading.set(false);
      },
    });
  }

  protected changeStatus(status: TaskStatus): void {
    const id = this.taskId;
    const current = this.task();
    if (id === null || !current || current.status === status || this.savingStatus()) {
      return;
    }

    this.savingStatus.set(true);
    this.tasks.setStatus(id, status).subscribe({
      next: (updated) => {
        this.task.set(updated);
        this.savingStatus.set(false);
        this.toast.success(`Status changed to ${STATUS_LABELS[status]}.`, 'Task updated');
      },
      error: (err: unknown) => {
        this.savingStatus.set(false);
        this.toast.error(errorMessage(err, 'Could not update the status.'));
      },
    });
  }

  protected async editTask(): Promise<void> {
    const current = this.task();
    if (!current) {
      return;
    }
    const updated = await this.taskForm().open(current);
    if (updated) {
      this.task.set(updated);
    }
  }

  protected async removeTask(): Promise<void> {
    const current = this.task();
    if (!current) {
      return;
    }
    const confirmed = await this.confirm().open({
      title: 'Delete task',
      message: `"${current.title}" and all of its comments and attachments will be permanently deleted.`,
      confirmLabel: 'Delete task',
    });
    if (!confirmed) {
      return;
    }

    this.tasks.remove(current.id).subscribe({
      next: () => {
        this.toast.success(`"${current.title}" was deleted.`, 'Task deleted');
        void this.router.navigate(['/tasks']);
      },
      error: (err: unknown) => this.toast.error(errorMessage(err, 'Could not delete the task.')),
    });
  }

  // ------------------------------------------------------------- comments

  protected onNewCommentInput(event: Event): void {
    this.newComment.set((event.target as HTMLTextAreaElement).value);
  }

  protected addComment(): void {
    const id = this.taskId;
    const body = this.newComment().trim();
    if (id === null || !body || this.posting()) {
      return;
    }

    this.posting.set(true);
    this.commentsApi.create(id, body).subscribe({
      next: (comment) => {
        this.comments.update((list) => [...list, comment]);
        this.newComment.set('');
        this.posting.set(false);
        this.task.update((task) =>
          task ? { ...task, commentCount: task.commentCount + 1 } : task,
        );
      },
      error: (err: unknown) => {
        this.posting.set(false);
        this.toast.error(errorMessage(err, 'Could not post the comment.'));
      },
    });
  }

  protected startEdit(comment: Comment): void {
    this.editingId.set(comment.id);
    this.editingBody.set(comment.body);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editingBody.set('');
  }

  protected onEditInput(event: Event): void {
    this.editingBody.set((event.target as HTMLTextAreaElement).value);
  }

  protected saveEdit(comment: Comment): void {
    const body = this.editingBody().trim();
    if (!body || this.savingComment()) {
      return;
    }

    this.savingComment.set(true);
    this.commentsApi.update(comment.id, body).subscribe({
      next: (updated) => {
        this.comments.update((list) =>
          list.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.savingComment.set(false);
        this.cancelEdit();
      },
      error: (err: unknown) => {
        this.savingComment.set(false);
        this.toast.error(errorMessage(err, 'Could not save the comment.'));
      },
    });
  }

  protected async removeComment(comment: Comment): Promise<void> {
    const confirmed = await this.confirm().open({
      title: 'Delete comment',
      message: 'This comment will be permanently deleted.',
      confirmLabel: 'Delete comment',
    });
    if (!confirmed) {
      return;
    }

    this.commentsApi.remove(comment.id).subscribe({
      next: () => {
        this.comments.update((list) => list.filter((item) => item.id !== comment.id));
        this.task.update((task) =>
          task ? { ...task, commentCount: Math.max(0, task.commentCount - 1) } : task,
        );
        this.toast.success('Comment deleted.', 'Comment removed');
      },
      error: (err: unknown) => this.toast.error(errorMessage(err, 'Could not delete the comment.')),
    });
  }

  // ---------------------------------------------------------- attachments

  protected pickFile(): void {
    this.fileInput().nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const id = this.taskId;
    if (!file || id === null || this.uploading()) {
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      this.toast.error('The file is larger than the 10 MB limit.', 'Upload rejected');
      return;
    }

    this.uploading.set(true);
    this.attachmentsApi.upload(id, file).subscribe({
      next: (attachment) => {
        this.attachments.update((list) => [...list, attachment]);
        this.uploading.set(false);
        this.toast.success(`"${attachment.fileName}" was uploaded.`, 'Attachment added');
        this.task.update((task) =>
          task ? { ...task, attachmentCount: task.attachmentCount + 1 } : task,
        );
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.toast.error(errorMessage(err, 'Could not upload the file.'));
      },
    });
  }

  protected download(attachment: Attachment): void {
    this.attachmentsApi.download(attachment).subscribe({
      next: (blob) => saveBlob(blob, attachment.fileName),
      error: (err: unknown) => this.toast.error(errorMessage(err, 'Could not download the file.')),
    });
  }

  protected async removeAttachment(attachment: Attachment): Promise<void> {
    const confirmed = await this.confirm().open({
      title: 'Delete attachment',
      message: `"${attachment.fileName}" will be permanently deleted.`,
      confirmLabel: 'Delete file',
    });
    if (!confirmed) {
      return;
    }

    this.attachmentsApi.remove(attachment.id).subscribe({
      next: () => {
        this.attachments.update((list) => list.filter((item) => item.id !== attachment.id));
        this.toast.success('Attachment deleted.', 'File removed');
        this.task.update((task) =>
          task ? { ...task, attachmentCount: Math.max(0, task.attachmentCount - 1) } : task,
        );
      },
      error: (err: unknown) => this.toast.error(errorMessage(err, 'Could not delete the file.')),
    });
  }
}
