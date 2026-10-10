import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import { Attachment } from '../models';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(taskId: number): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.api}/tasks/${taskId}/attachments`);
  }

  /** Multipart upload — the API expects the field name to be exactly `file`. */
  upload(taskId: number, file: File): Observable<Attachment> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<Attachment>(`${this.api}/tasks/${taskId}/attachments`, form);
  }

  /**
   * Streams the binary with the bearer token attached (a plain `<a download>`
   * would send an unauthenticated request and be rejected).
   */
  download(attachment: Attachment): Observable<Blob> {
    return this.http.get(this.resolveUrl(attachment), { responseType: 'blob' });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/attachments/${id}`);
  }

  private resolveUrl(attachment: Attachment): string {
    const raw = (attachment.downloadUrl ?? '').trim();
    if (!raw) {
      return `${this.api}/attachments/${attachment.id}/download`;
    }
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    const base = this.api.replace(/\/+$/, '');
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    // `downloadUrl` is normally already rooted at `/api/...`; avoid doubling it.
    return `${base}${path}`.replace(/\/api\/api\//i, '/api/');
  }
}
