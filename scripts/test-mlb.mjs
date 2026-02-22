/**
 * Quick test: fetch today's MLB scores and print them.
 * Run with: node scripts/test-mlb.mjs
 *
 * Uses the MLB Stats API directly (no build step needed).
 */

const MLB_API = 'https://statsapi.mlb.com/api/v1';
const MLB_API_LIVE = 'https://statsapi.mlb.com/api/v1.1';

// ── Status mapping (mirrors lib/data-sources/mlb.ts) ────────────────

function mapStatus(statusCode) {
  if (['I', 'MA', 'MB', 'MC'].includes(statusCode)) return 'LIVE';
  if (['F', 'FT', 'FR', 'FO', 'CR', 'GO'].includes(statusCode)) return 'FINAL';
  if (['PO', 'PI', 'CO'].includes(statusCode)) return 'PPD';
  if (['DI', 'DR', 'DG'].includes(statusCode)) return 'DELAY';
  return 'SCHED';
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const dateArg = process.argv[2];
  const today = dateArg || new Date().toISOString().slice(0, 10);

  console.log(`\n⚾  MLB Scores for ${today}\n${'─'.repeat(50)}`);

  const res = await fetch(
    `${MLB_API}/schedule?sportId=1&date=${today}&hydrate=linescore,team`
  );
  if (!res.ok) {
    console.error(`API error: ${res.status}`);
    process.exit(1);
  }

  const data = await res.json();

  if (!data.dates?.length) {
    console.log('No games today.');
    return;
  }

  const games = data.dates[0].games;
  console.log(`${games.length} game(s)\n`);

  for (const g of games) {
    const status = mapStatus(g.status.statusCode);
    const home = g.teams.home;
    const away = g.teams.away;
    const ls = g.linescore;

    const homeAbbr = (home.team.abbreviation || home.team.name).padEnd(4);
    const awayAbbr = (away.team.abbreviation || away.team.name).padEnd(4);

    const time = new Date(g.gameDate).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    if (status === 'SCHED') {
      console.log(`  ${awayAbbr} @  ${homeAbbr}  ${time}`);
    } else if (status === 'LIVE') {
      const inn = ls?.isTopInning ? '▲' : '▼';
      const inning = `${inn}${ls?.currentInning || '?'}`;
      const outs = ls?.outs != null ? `${ls.outs} out` : '';
      console.log(
        `  ${awayAbbr} ${away.score ?? 0}  @  ${homeAbbr} ${home.score ?? 0}` +
        `   ${inning} ${outs}  🔴 LIVE`
      );

      // Fetch live detail for count/runners
      try {
        const liveRes = await fetch(`${MLB_API_LIVE}/game/${g.gamePk}/feed/live`);
        if (liveRes.ok) {
          const feed = await liveRes.json();
          const play = feed.liveData?.plays?.currentPlay;
          if (play) {
            const c = play.count;
            const matchup = play.matchup;
            console.log(
              `         ${c.balls}-${c.strikes} count, ${c.outs} out` +
              `  |  ${matchup.pitcher.fullName} → ${matchup.batter.fullName}`
            );
          }
        }
      } catch { /* live feed optional */ }
    } else if (status === 'FINAL') {
      const winner = (home.score ?? 0) > (away.score ?? 0) ? 'home' : 'away';
      console.log(
        `  ${awayAbbr} ${away.score ?? 0}  @  ${homeAbbr} ${home.score ?? 0}` +
        `   FINAL`
      );
      // Print linescore
      if (ls?.innings?.length) {
        const header = ls.innings.map((i) => String(i.num).padStart(3)).join('');
        const awayLine = ls.innings.map((i) => String(i.away?.runs ?? '-').padStart(3)).join('');
        const homeLine = ls.innings.map((i) => String(i.home?.runs ?? '-').padStart(3)).join('');
        console.log(`         INN${header}   R  H  E`);
        console.log(
          `         ${awayAbbr}${awayLine}  ` +
          `${String(away.score ?? 0).padStart(2)} ` +
          `${String(ls.teams?.away?.hits ?? 0).padStart(2)} ` +
          `${String(ls.teams?.away?.errors ?? 0).padStart(2)}`
        );
        console.log(
          `         ${homeAbbr}${homeLine}  ` +
          `${String(home.score ?? 0).padStart(2)} ` +
          `${String(ls.teams?.home?.hits ?? 0).padStart(2)} ` +
          `${String(ls.teams?.home?.errors ?? 0).padStart(2)}`
        );
      }
    } else {
      console.log(`  ${awayAbbr} @  ${homeAbbr}  ${status}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
