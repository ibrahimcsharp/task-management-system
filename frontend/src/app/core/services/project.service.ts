import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import { CreateProjectRequest, Project, UpdateProjectRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(includeArchived = false): Observable<Project[]> {
    let params = new HttpParams();
    if (includeArchived) {
      params = params.set('includeArchived', 'true');
    }
    return this.http.get<Project[]>(`${this.api}/projects`, { params });
  }

  get(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.api}/projects/${id}`);
  }

  create(payload: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(`${this.api}/projects`, payload);
  }

  update(id: number, payload: UpdateProjectRequest): Observable<Project> {
    return this.http.put<Project>(`${this.api}/projects/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/projects/${id}`);
  }
}
