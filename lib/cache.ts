import NodeCache from 'node-cache';

// Default TTL of 30 seconds for live game data
export const gameCache = new NodeCache({ stdTTL: 30, checkperiod: 10 });

// Longer TTL for standings (5 minutes)
export const standingsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Schedule data changes infrequently (15 minutes)
export const scheduleCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

/**
 * Stale fallback cache: holds last successful data for up to 10 minutes.
 * Consulted when a fresh fetch fails and the main cache has expired.
 * This lets the UI show slightly-old data rather than a total error.
 */
const staleCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

/** Write to both the main cache and the stale fallback cache. */
export function setWithStale<T>(key: string, value: T, ttlSeconds?: number): void {
  if (ttlSeconds !== undefined) {
    gameCache.set(key, value, ttlSeconds);
  } else {
    gameCache.set(key, value);
  }
  staleCache.set(key, value);
}

/** Read stale data for a key (ignores main cache TTL). */
export function getStale<T>(key: string): T | undefined {
  return staleCache.get<T>(key);
}
