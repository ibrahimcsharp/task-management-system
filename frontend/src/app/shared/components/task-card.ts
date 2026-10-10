import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TaskItem } from '@core/models';
import { toInitials } from '@shared/utils/format';

import { AppIcon } from './app-icon';
import { PriorityBadge } from './priority-badge';
import { RelativeDatePipe } from '../pipes/relative-date.pipe';
import { StatusBadge } from './status-badge';

/**
 * Compact, clickable summary of one task. Used by the dashboard "Upcoming" list
 * and anywhere a task needs to be rendered as a row rather than a table cell.
 */
@Component({
  selector: 'app-task-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppIcon, StatusBadge, PriorityBadge, RelativeDatePipe],
  template: `
    <a
      class="task-card"
      [class.overdue]="task().isOverdue"
      [routerLink]="['/tasks', task().id]"
    >
      <span
        class="accent"
        [style.background]="task().projectColor || 'var(--border-strong)'"
      ></span>

      <span class="main">
        <span class="title-row">
          <span class="title truncate">{{ task().title }}</span>
          @if (task().isOverdue) {
            <span class="overdue-flag">
              <app-icon name="alertTriangle" [size]="12" [strokeWidth]="2.1" />
              Overdue
            </span>
          }
        </span>

        <span class="meta">
          @if (task().projectName; as projectName) {
            <span class="meta-chip">
              <span
                class="meta-dot"
                [style.background]="task().projectColor || 'var(--text-subtle)'"
              ></span>
              {{ projectName }}
            </span>
          }
          <span class="meta-item">
            <app-icon name="calendar" [size]="12" />
            {{ task().dueDate | relativeDate: 'due' }}
          </span>
          @if (task().commentCount > 0) {
            <span class="meta-item">
              <app-icon name="message" [size]="12" />
              {{ task().commentCount }}
            </span>
          }
          @if (task().attachmentCount > 0) {
            <span class="meta-item">
              <app-icon name="paperclip" [size]="12" />
              {{ task().attachmentCount }}
            </span>
          }
        </span>
      </span>

      <span class="side">
        <app-priority-badge [priority]="task().priority" size="sm" />
        <app-status-badge [status]="task().status" size="sm" />
        <span
          class="avatar avatar-sm"
          [attr.title]="task().assigneeName ?? 'Unassigned'"
          [class.muted]="!task().assigneeName"
        >
          {{ assigneeInitials() }}
        </span>
      </span>
    </a>
  `,
  styles: [
    `
      .task-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 11px 14px 11px 0;
        border-bottom: 1px solid var(--border-soft);
        color: inherit;
        text-decoration: none;
        transition: background var(--t-fast) var(--ease);
      }
      .task-card:last-child {
        border-bottom: 0;
      }
      .task-card:hover {
        background: var(--primary-softer);
        text-decoration: none;
      }
      .accent {
        width: 3px;
        align-self: stretch;
        flex: none;
        border-radius: 0 3px 3px 0;
      }
      .main {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .title {
        font-size: 13.5px;
        font-weight: 550;
        color: var(--text);
      }
      .task-card.overdue .title {
        color: var(--danger-hover);
      }
      .overdue-flag {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex: none;
        font-size: 11px;
        font-weight: 650;
        color: var(--danger);
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: var(--text-muted);
      }
      .meta-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-weight: 550;
      }
      .meta-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex: none;
      }
      .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .side {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: none;
      }
      .avatar.muted {
        background: var(--surface-sunken);
        color: var(--text-subtle);
        border: 1px dashed var(--border-strong);
      }
      @media (max-width: 640px) {
        .side app-status-badge {
          display: none;
        }
        .meta {
          gap: 8px;
        }
      }
    `,
  ],
})
export class TaskCard {
  readonly task = input.required<TaskItem>();

  protected assigneeInitials(): string {
    const name = this.task().assigneeName;
    return name ? toInitials(name) : '?';
  }
}
