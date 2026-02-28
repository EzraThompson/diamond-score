/**
 * Per-domain rate limiter.
 * Enforces a minimum interval between consecutive requests to the same host,
 * preventing hammer-style polling of any single data source.
 *
 * Polling intervals are also configurable per source so that high-churn
 * scrapers (KBO, NPB) get appropriate breathing room.
 */

/** Minimum milliseconds between requests per hostname. */
const DOMAIN_MIN_INTERVAL_MS: Record<string, number> = {
  'www.koreabaseball.com': 500,   // KBO ASMX API — max ~2 req/s
  'npb.jp':                1000,  // NPB scraper — max 1 req/s; be polite
  'statsapi.mlb.com':      100,   // MLB Stats API — official, generous limits
  'site.api.espn.com':     100,   // ESPN public API
};

/** Configurable polling intervals per data source (ms). Callers may read this
 *  to decide how often to trigger background refreshes. */
export const POLL_INTERVAL_MS: Record<string, number> = {
  mlb:   30_000,   // 30s — live MLB games update frequently
  milb:  60_000,   // 60s — MiLB is less critical
  npb:   60_000,   // 60s — scraped; be gentle
  kbo:   60_000,   // 60s — scraped; be gentle
  ncaa:  60_000,   // 60s — ESPN API
};

/** Last-request timestamp per hostname. Module-level so it persists across calls in the same process. */
const lastRequestAt = new Map<string, number>();

/**
 * Waits if necessary to respect the per-domain minimum interval, then
 * records the current time as the last request for this host.
 */
export async function throttle(url: string): Promise<void> {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }

  const interval = DOMAIN_MIN_INTERVAL_MS[hostname];
  if (!interval) return;

  const last = lastRequestAt.get(hostname) ?? 0;
  const wait = Math.max(0, last + interval - Date.now());

  if (wait > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, wait));
  }

  lastRequestAt.set(hostname, Date.now());
}
