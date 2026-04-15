import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }

  static unauthorized(message = 'Not authenticated') {
    return new ApiError('UNAUTHORIZED', message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError('FORBIDDEN', message, 403);
  }
  static notFound(message = 'Not found') {
    return new ApiError('NOT_FOUND', message, 404);
  }
  static validation(details: unknown, message = 'Validation failed') {
    return new ApiError('VALIDATION_ERROR', message, 422, details);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError('CONFLICT', message, 409, details);
  }
  static internal(message = 'Internal error') {
    return new ApiError('INTERNAL', message, 500);
  }
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details ?? undefined } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.flatten() } },
      { status: 422 },
    );
  }
  console.error('[api] unhandled error', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Internal error' } },
    { status: 500 },
  );
}
