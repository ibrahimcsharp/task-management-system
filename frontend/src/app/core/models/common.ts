/** Shared enums + generic containers returned by the Task Manager API. */

export type TaskStatus =
  | 'NotStarted'
  | 'InProgress'
  | 'UnderReview'
  | 'Completed'
  | 'Blocked'
  | 'Cancelled';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type UserRole = 'User' | 'Admin';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface NameCount {
  name: string;
  count: number;
}

export interface DateCount {
  date: string;
  count: number;
}

/** Canonical status list — order matches the backend enum. */
export const TASK_STATUSES: readonly TaskStatus[] = [
  'NotStarted',
  'InProgress',
  'UnderReview',
  'Completed',
  'Blocked',
  'Cancelled',
] as const;

/** Canonical priority list — order matches the backend enum. */
export const TASK_PRIORITIES: readonly TaskPriority[] = [
  'Low',
  'Medium',
  'High',
  'Urgent',
] as const;

export const USER_ROLES: readonly UserRole[] = ['User', 'Admin'] as const;

/** Human readable labels, e.g. `UnderReview` -> `Under Review`. */
export const STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  NotStarted: 'Not Started',
  InProgress: 'In Progress',
  UnderReview: 'Under Review',
  Completed: 'Completed',
  Blocked: 'Blocked',
  Cancelled: 'Cancelled',
};

export const PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Urgent: 'Urgent',
};

/** CSS custom property names used by the badge components. */
export const STATUS_TOKENS: Readonly<Record<TaskStatus, string>> = {
  NotStarted: '--status-not-started',
  InProgress: '--status-in-progress',
  UnderReview: '--status-under-review',
  Completed: '--status-completed',
  Blocked: '--status-blocked',
  Cancelled: '--status-cancelled',
};

export const PRIORITY_TOKENS: Readonly<Record<TaskPriority, string>> = {
  Low: '--priority-low',
  Medium: '--priority-medium',
  High: '--priority-high',
  Urgent: '--priority-urgent',
};

/** Fields accepted by `GET /tasks`. All optional. */
export interface TaskQuery {
  search?: string | null;
  status?: TaskStatus | string | null;
  priority?: TaskPriority | string | null;
  projectId?: number | null;
  assigneeId?: number | null;
  createdById?: number | null;
  dueFrom?: string | null;
  dueTo?: string | null;
  isOverdue?: boolean | null;
  sortBy?: TaskSortField;
  sortDescending?: boolean;
  page?: number;
  pageSize?: number;
}

export type TaskSortField =
  | 'dueDate'
  | 'priority'
  | 'status'
  | 'title'
  | 'createdAt'
  | 'updatedAt';
