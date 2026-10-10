import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  message: string;
  /** Milliseconds before the toast is removed. */
  duration: number;
  /** Set shortly before removal so the host can play its exit animation. */
  leaving: boolean;
}

/**
 * Minimal global notification bus. `ToastHost` renders `toasts()` fixed to the
 * top-right; every mutation in the app reports its outcome through here.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;

  readonly toasts = signal<readonly Toast[]>([]);

  success(message: string, title = 'Success'): void {
    this.push('success', title, message);
  }

  error(message: string, title = 'Something went wrong'): void {
    this.push('error', title, message, 6000);
  }

  info(message: string, title = 'Heads up'): void {
    this.push('info', title, message);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }

  private push(
    variant: ToastVariant,
    title: string,
    message: string,
    duration = 4000,
  ): void {
    const toast: Toast = {
      id: ++this.nextId,
      variant,
      title,
      message,
      duration,
      leaving: false,
    };
    this.toasts.update((list) => [...list, toast]);

    // Auto-dismiss: flag the toast so it can play its exit animation first.
    setTimeout(() => this.markLeaving(toast.id), Math.max(duration - 180, 400));
    setTimeout(() => this.dismiss(toast.id), duration);
  }

  private markLeaving(id: number): void {
    this.toasts.update((list) =>
      list.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    );
  }
}
