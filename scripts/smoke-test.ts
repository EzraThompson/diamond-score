/**
 * Smoke test script — runs against a live deployment and validates that
 * each key API endpoint responds correctly with the expected data shape.
 *
 * Usage:
 *   SMOKE_TEST_URL=https://your-staging-url.up.railway.app npm run smoke
 *   npm run smoke   # defaults to http://localhost:3000
 *
 * Exit code 0 = all checks passed
 * Exit code 1 = one or more checks failed
 */

const BASE_URL = process.env.SMOKE_TEST_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
const today = new Date().toISOString().slice(0, 10);

interface Check {
  name: string;
  url: string;
  validate: (data: unknown) => boolean;
  /** If true, a non-200 status is still considered passing (e.g. optional sources). */
  optional?: boolean;
}

function hasLeagues(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as Record<string, unknown>).leagues)
  );
}

const checks: Check[] = [
  // ── Health ──────────────────────────────────────────────────────────────
  {
    name: 'GET /api/health',
    url: `${BASE_URL}/api/health`,
    validate: (d) =>
      typeof d === 'object' &&
      d !== null &&
      'sources' in (d as object),
  },

  // ── Per-league score endpoints ───────────────────────────────────────────
  {
    name: `GET /api/scores/mlb?date=${today}`,
    url: `${BASE_URL}/api/scores/mlb?date=${today}`,
    validate: hasLeagues,
  },
  {
    name: `GET /api/scores/wbc?date=${today}`,
    url: `${BASE_URL}/api/scores/wbc?date=${today}`,
    validate: hasLeagues,
  },
  {
    name: `GET /api/scores/milb?date=${today}`,
    url: `${BASE_URL}/api/scores/milb?date=${today}`,
    validate: hasLeagues,
  },
  {
    name: `GET /api/scores/npb?date=${today}`,
    url: `${BASE_URL}/api/scores/npb?date=${today}`,
    validate: hasLeagues,
    optional: true, // scraping may be down
  },
  {
    name: `GET /api/scores/kbo?date=${today}`,
    url: `${BASE_URL}/api/scores/kbo?date=${today}`,
    validate: hasLeagues,
    optional: true, // scraping may be down
  },
  {
    name: `GET /api/scores/ncaa?date=${today}`,
    url: `${BASE_URL}/api/scores/ncaa?date=${today}`,
    validate: hasLeagues,
  },

  // ── Combined scores (SSE fallback path) ─────────────────────────────────
  {
    name: `GET /api/scores?date=${today}`,
    url: `${BASE_URL}/api/scores?date=${today}`,
    validate: (d) =>
      typeof d === 'object' &&
      d !== null &&
      'leagues' in (d as object) &&
      'hasLive' in (d as object),
  },

  // ── Standings ────────────────────────────────────────────────────────────
  {
    name: 'GET /api/standings (MLB)',
    url: `${BASE_URL}/api/standings`,
    validate: (d) =>
      typeof d === 'object' &&
      d !== null &&
      ('divisions' in (d as object) || 'error' in (d as object)),
  },
  {
    name: 'GET /api/standings/wbc',
    url: `${BASE_URL}/api/standings/wbc`,
    validate: (d) =>
      typeof d === 'object' &&
      d !== null &&
      ('pools' in (d as object) || 'error' in (d as object)),
  },

  // ── WBC bracket ─────────────────────────────────────────────────────────
  {
    name: 'GET /api/wbc/bracket',
    url: `${BASE_URL}/api/wbc/bracket`,
    validate: (d) =>
      typeof d === 'object' &&
      d !== null &&
      Array.isArray((d as Record<string, unknown>).quarterfinals) &&
      Array.isArray((d as Record<string, unknown>).semifinals) &&
      Array.isArray((d as Record<string, unknown>).championship),
  },
];

// ── Runner ───────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🚀  Smoke testing ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const check of checks) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const start = Date.now();
      const res = await fetch(check.url, { signal: controller.signal });
      clearTimeout(timeout);
      const ms = Date.now() - start;

      if (!res.ok) {
        if (check.optional) {
          console.log(`  ⚠  ${check.name} → HTTP ${res.status} (optional, skipped) ${ms}ms`);
          skipped++;
        } else {
          console.error(`  ✗  ${check.name} → HTTP ${res.status} (${ms}ms)`);
          failed++;
        }
        continue;
      }

      const data: unknown = await res.json();

      if (!check.validate(data)) {
        console.error(`  ✗  ${check.name} → unexpected response shape (${ms}ms)`);
        console.error(`     got: ${JSON.stringify(data).slice(0, 200)}`);
        failed++;
        continue;
      }

      console.log(`  ✓  ${check.name} (${ms}ms)`);
      passed++;
    } catch (err) {
      if (check.optional) {
        console.log(`  ⚠  ${check.name} → ${err} (optional, skipped)`);
        skipped++;
      } else {
        console.error(`  ✗  ${check.name} → ${err}`);
        failed++;
      }
    }
  }

  const total = passed + failed + skipped;
  console.log(`\n  ${passed}/${total} passed${skipped > 0 ? `, ${skipped} skipped (optional)` : ''}, ${failed} failed\n`);

  if (failed > 0) {
    console.error('❌  Smoke test FAILED\n');
    process.exit(1);
  }
  console.log('✅  All checks passed\n');
}

run();
