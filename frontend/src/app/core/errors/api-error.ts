import { HttpErrorResponse } from '@angular/common/http';

/**
 * Shape of an ASP.NET Core RFC 7807 `ProblemDetails` response.
 * Validation failures additionally carry `errors` keyed by camelCase field name.
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]> | null;
  [key: string]: unknown;
}

const GENERIC_BY_STATUS: Record<number, string> = {
  400: 'The request could not be processed. Please check your input.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested item no longer exists.',
  405: 'That operation is not allowed.',
  409: 'That change conflicts with the current data. Please refresh and retry.',
  413: 'That file is too large to upload.',
  415: 'That file type is not supported.',
  422: 'The submitted values were rejected by the server.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on the server. Please try again.',
  502: 'The server is temporarily unavailable.',
  503: 'The server is temporarily unavailable.',
  504: 'The server did not respond in time. Please try again.',
};

/** Lower-cases the first character so backend keys line up with form control names. */
function normaliseKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceErrors(raw: unknown): Record<string, string[]> {
  if (!isRecord(raw)) {
    return {};
  }
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      result[normaliseKey(key)] = value.map((v) => String(v));
    } else if (typeof value === 'string') {
      result[normaliseKey(key)] = [value];
    }
  }
  return result;
}

/**
 * Normalised error surfaced to the UI. Every `HttpClient` failure is mapped to
 * an `ApiError` by `errorInterceptor`, so feature code only has to handle one shape.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;
  readonly problem: ProblemDetails | null;
  readonly isNetworkError: boolean;
  readonly url: string;

  constructor(options: {
    message: string;
    status: number;
    fieldErrors?: Record<string, string[]>;
    problem?: ProblemDetails | null;
    isNetworkError?: boolean;
    url?: string;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.fieldErrors = options.fieldErrors ?? {};
    this.problem = options.problem ?? null;
    this.isNetworkError = options.isNetworkError ?? false;
    this.url = options.url ?? '';
  }

  static fromHttp(response: HttpErrorResponse): ApiError {
    const problem: ProblemDetails | null = isRecord(response.error)
      ? (response.error as ProblemDetails)
      : null;

    if (response.status === 0 || !response.status) {
      return new ApiError({
        message:
          'Cannot reach the server. Make sure the Task Manager API is running and try again.',
        status: 0,
        problem,
        isNetworkError: true,
        url: response.url ?? '',
      });
    }

    const detail = typeof problem?.detail === 'string' ? problem.detail.trim() : '';
    const title = typeof problem?.title === 'string' ? problem.title.trim() : '';
    const fieldErrors = coerceErrors(problem?.errors);

    let message = detail || title;
    if (!message) {
      message =
        GENERIC_BY_STATUS[response.status] ||
        response.statusText ||
        `Request failed (${response.status}).`;
    }

    // When the payload only carries per-field errors, summarise them for the toast.
    if (!detail && !title && Object.keys(fieldErrors).length > 0) {
      message = 'Please fix the highlighted fields and try again.';
    }

    return new ApiError({
      message,
      status: response.status,
      fieldErrors,
      problem,
      url: response.url ?? '',
    });
  }

  static isApiError(value: unknown): value is ApiError {
    return value instanceof ApiError;
  }
}

/** Human readable message for any thrown value. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (ApiError.isApiError(err)) {
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'string' && err.trim()) {
    return err;
  }
  return fallback;
}

/** Per-field errors for any thrown value (empty when there are none). */
export function fieldErrorsOf(err: unknown): Record<string, string[]> {
  return ApiError.isApiError(err) ? err.fieldErrors : {};
}

/** Status code for any thrown value (0 for network failures / unknown). */
export function errorStatusOf(err: unknown): number {
  if (ApiError.isApiError(err)) {
    return err.status;
  }
  if (err instanceof HttpErrorResponse) {
    return err.status;
  }
  return 0;
}
