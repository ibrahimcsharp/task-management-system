import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import {
  CreateTaskRequest,
  PagedResult,
  TaskItem,
  TaskQuery,
  TaskStatus,
  UpdateTaskRequest,
} from '../models';

/** Builds the `GET /tasks` query string, omitting anything unset or blank. */
function buildParams(query: TaskQuery): HttpParams {
  let params = new HttpParams();

  const text = (key: string, value: string | null | undefined): void => {
    const trimmed = (value ?? '').trim();
    if (trimmed) {
      params = params.set(key, trimmed);
    }
  };
  const number = (key: string, value: number | null | undefined): void => {
    if (value !== null && value !== undefined && !Number.isNaN(value)) {
      params = params.set(key, String(value));
    }
  };
  const bool = (key: string, value: boolean | null | undefined): void => {
    if (value === true || value === false) {
      params = params.set(key, String(value));
    }
  };

  text('search', query.search);
  text('status', query.status);
  text('priority', query.priority);
  number('projectId', query.projectId);
  number('assigneeId', query.assigneeId);
  number('createdById', query.createdById);
  text('dueFrom', query.dueFrom);
  text('dueTo', query.dueTo);
  bool('isOverdue', query.isOverdue);
  text('sortBy', query.sortBy);
  bool('sortDescending', query.sortDescending);
  number('page', query.page);
  number('pageSize', query.pageSize);

  return params;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  query(query: TaskQuery): Observable<PagedResult<TaskItem>> {
    return this.http.get<PagedResult<TaskItem>>(`${this.api}/tasks`, {
      params: buildParams(query),
    });
  }

  get(id: number): Observable<TaskItem> {
    return this.http.get<TaskItem>(`${this.api}/tasks/${id}`);
  }

  create(payload: CreateTaskRequest): Observable<TaskItem> {
    return this.http.post<TaskItem>(`${this.api}/tasks`, payload);
  }

  update(id: number, payload: UpdateTaskRequest): Observable<TaskItem> {
    return this.http.put<TaskItem>(`${this.api}/tasks/${id}`, payload);
  }

  setStatus(id: number, status: TaskStatus): Observable<TaskItem> {
    return this.http.patch<TaskItem>(`${this.api}/tasks/${id}/status`, { status });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/tasks/${id}`);
  }
}
