import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '@/lib/retry';

// Silence logger output during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
    timed: vi.fn(() => vi.fn()),
  },
}));

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns the value immediately when fn succeeds on the first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const promise = withRetry(fn);
    await vi.runAllTimersAsync();
    expect(await promise).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries after failure and returns value on a later attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const promise = withRetry(fn, { retries: 3, baseDelayMs: 100 });
    await vi.runAllTimersAsync();

    expect(await promise).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error after exhausting all retries', async () => {
    const error = new Error('always fails');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { retries: 2, baseDelayMs: 100 });
    // Attach rejection handler BEFORE running timers to prevent unhandled-rejection warnings
    const assertion = expect(promise).rejects.toThrow('always fails');
    await vi.runAllTimersAsync();
    await assertion;
    // 1 initial attempt + 2 retries = 3 total calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('uses exponential backoff delays (1×, 2×, 4× baseDelayMs)', async () => {
    const delays: number[] = [];
    const realSetTimeout = global.setTimeout;

    // Spy on setTimeout to capture delay values
    const spy = vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
      if (typeof delay === 'number') delays.push(delay);
      return realSetTimeout(fn as () => void, 0); // execute immediately in test
    });

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { retries: 3, baseDelayMs: 1000 });
    await vi.runAllTimersAsync();
    await promise;

    // Delays should be 1000, 2000, 4000 (exponential)
    const backoffDelays = delays.filter((d) => d >= 1000);
    expect(backoffDelays).toEqual([1000, 2000, 4000]);

    spy.mockRestore();
  });

  it('does not retry when retries is 0', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    const promise = withRetry(fn, { retries: 0 });
    // Attach rejection handler BEFORE running timers to prevent unhandled-rejection warnings
    const assertion = expect(promise).rejects.toThrow('fail');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops retrying as soon as fn succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('early win');

    const promise = withRetry(fn, { retries: 5, baseDelayMs: 100 });
    await vi.runAllTimersAsync();

    expect(await promise).toBe('early win');
    expect(fn).toHaveBeenCalledTimes(2); // 1 fail + 1 success, not 6
  });
});
