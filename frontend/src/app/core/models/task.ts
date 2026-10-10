import { TaskPriority, TaskStatus } from './common';

export interface TaskItem {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  isOverdue: boolean;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  createdById: number;
  createdByName: string;
  commentCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateTaskRequest {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: number | null;
  assigneeId: number | null;
}

export type UpdateTaskRequest = CreateTaskRequest;

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}
