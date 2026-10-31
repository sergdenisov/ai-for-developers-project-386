import { QueryClient } from '@tanstack/react-query';

import type { ApiError } from './api/generated/index.ts';

const maxRetries = 3;

/**
 * Retries a failed query only when asking again may help: after a network failure or `INTERNAL_ERROR`. Any other
 * `ApiError` (`NOT_FOUND`, `VALIDATION_FAILED`...) is the server's final answer and shows at once.
 */
function shouldRetry(failureCount: number, error: unknown) {
  // The error is the parsed `ApiError` body, unless the request did not reach the server at all.
  const { code } = error as Partial<ApiError>;
  return failureCount < maxRetries && (code === undefined || code === 'INTERNAL_ERROR');
}

/** The app's query cache; tests pass `retryDelay: 0` so that retries do not slow them down. */
export function createQueryClient({ retryDelay }: { retryDelay?: number } = {}) {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry, retryDelay } },
  });
}
