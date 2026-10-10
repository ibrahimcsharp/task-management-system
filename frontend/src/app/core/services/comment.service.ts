import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import { Comment } from '../models';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(taskId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.api}/tasks/${taskId}/comments`);
  }

  create(taskId: number, body: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.api}/tasks/${taskId}/comments`, { body });
  }

  update(id: number, body: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.api}/comments/${id}`, { body });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/comments/${id}`);
  }
}
