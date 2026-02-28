/**
 * Structured logger for diamond-score.
 * Outputs newline-delimited JSON to stdout/stderr for easy parsing.
 */

type Level = 'info' | 'warn' | 'error';

export interface LogFields {
  source?: string;    // data source name: 'mlb' | 'kbo' | 'npb' | 'ncaa' | 'milb'
  url?: string;
  status?: number;    // HTTP status code
  durationMs?: number;
  attempt?: number;   // retry attempt number (1-based)
  error?: string;
  [key: string]: unknown;
}

function log(level: Level, message: string, fields?: LogFields): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export const logger = {
  info:  (msg: string, fields?: LogFields) => log('info',  msg, fields),
  warn:  (msg: string, fields?: LogFields) => log('warn',  msg, fields),
  error: (msg: string, fields?: LogFields) => log('error', msg, fields),

  /** Log a timed fetch result. Call before fetch, use the returned done() after. */
  timed(source: string, url: string): (opts?: { status?: number; error?: string }) => void {
    const start = Date.now();
    return (opts = {}) => {
      const durationMs = Date.now() - start;
      if (opts.error) {
        log('error', 'fetch failed', { source, url, durationMs, ...opts });
      } else {
        log('info', 'fetch ok', { source, url, durationMs, status: opts.status ?? 200 });
      }
    };
  },
};
