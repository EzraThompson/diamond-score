import { logger } from './logger';

interface RetryOptions {
  retries?: number;       // number of extra attempts after the first (default: 3)
  baseDelayMs?: number;   // initial backoff delay (default: 1000ms)
  source?: string;        // for log context
  label?: string;         // human-readable description of the operation
}

/**
 * Retry fn with exponential backoff.
 * Delays: baseDelayMs, baseDelayMs*2, baseDelayMs*4, ...
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 3, baseDelayMs = 1000, source, label = 'fetch' } = options;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (attempt <= retries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        logger.warn(`Retry ${attempt}/${retries}: ${label}`, {
          source,
          attempt,
          nextDelayMs: delay,
          error: String(err),
        });
        await sleep(delay);
      }
    }
  }

  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
