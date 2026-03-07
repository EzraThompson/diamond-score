import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle, POLL_INTERVAL_MS } from '@/lib/rateLimiter';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately for an unknown domain (no rate limit defined)', async () => {
    const start = Date.now();
    await throttle('https://example.com/api/data');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5);
  });

  it('resolves immediately for a malformed URL (no crash)', async () => {
    await expect(throttle('not-a-url')).resolves.toBeUndefined();
  });

  it('allows the first request to a rate-limited domain immediately', async () => {
    // Advance fake time to avoid any stale state from prior tests
    vi.setSystemTime(Date.now() + 10_000);
    const start = Date.now();
    await throttle('https://statsapi.mlb.com/api/v1/schedule');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5); // no waiting
  });

  it('waits the correct interval before a second request to KBO', async () => {
    const KBO_INTERVAL = 500;
    // Use a large offset to avoid cross-test state in lastRequestAt
    const baseTime = Date.now() + 20_000;
    vi.setSystemTime(baseTime);

    // First request — should be immediate (no prior timestamp)
    await throttle('https://www.koreabaseball.com/ws/Main.asmx');

    // Second request immediately — will call setTimeout(resolve, ~500)
    let done = false;
    const p = throttle('https://www.koreabaseball.com/ws/Main.asmx').then(() => {
      done = true;
    });

    // Advance by just under the full interval — promise should still be pending
    await vi.advanceTimersByTimeAsync(KBO_INTERVAL - 10);
    expect(done).toBe(false);

    // Advance the remaining time — timer fires, promise resolves
    await vi.advanceTimersByTimeAsync(10);
    expect(done).toBe(true);

    await p;
  });

  it('does not wait if enough time has already passed', async () => {
    const baseTime = Date.now() + 30_000;
    vi.setSystemTime(baseTime);

    // First request at baseTime — recorded in lastRequestAt
    await throttle('https://npb.jp/scores');

    // Jump time forward past the NPB interval (1000ms) WITHOUT advancing timers
    // (vi.setSystemTime moves the clock without running queued timers)
    vi.setSystemTime(baseTime + 2000);

    // Second request should see wait = 0, skip setTimeout entirely, and resolve immediately
    const start = Date.now(); // fake time = baseTime + 2000
    await throttle('https://npb.jp/scores');
    // Because no timers were advanced, Date.now() is unchanged = 0ms elapsed
    const elapsed = Date.now() - start;
    expect(elapsed).toBe(0);
  });
});

describe('POLL_INTERVAL_MS', () => {
  it('exports polling intervals for all major sources', () => {
    expect(POLL_INTERVAL_MS.mlb).toBeGreaterThan(0);
    expect(POLL_INTERVAL_MS.milb).toBeGreaterThan(0);
    expect(POLL_INTERVAL_MS.npb).toBeGreaterThan(0);
    expect(POLL_INTERVAL_MS.kbo).toBeGreaterThan(0);
    expect(POLL_INTERVAL_MS.ncaa).toBeGreaterThan(0);
  });

  it('polls MLB more frequently than scraping sources', () => {
    expect(POLL_INTERVAL_MS.mlb).toBeLessThan(POLL_INTERVAL_MS.npb);
    expect(POLL_INTERVAL_MS.mlb).toBeLessThan(POLL_INTERVAL_MS.kbo);
  });
});
