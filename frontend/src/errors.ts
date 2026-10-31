import type { ApiError } from './api/generated/index.ts';

/** The message for a required field the user left empty. */
export const requiredMessage = 'Обязательное поле';

/** Fallback for errors that bring no message from the server, such as a lost connection. */
export const unexpectedMessage = 'Что-то пошло не так, попробуйте ещё раз';

/**
 * The `ApiError` a request failed with. TanStack Query hands over the parsed error body, or whatever was thrown when
 * the request did not reach the server at all (a lost connection); then nothing of the error is known.
 */
export function apiErrorOf(error: unknown): Partial<ApiError> {
  return typeof error === 'object' && error !== null && 'code' in error ? (error as ApiError) : {};
}
