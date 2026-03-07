import type { Metadata } from 'next';
import ScoresView from '@/components/ScoresView';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://play-o-graph.com';

export const metadata: Metadata = {
  title: 'Live Baseball Scores — MLB, KBO, NPB, MiLB & College',
  description: 'Live baseball scores from MLB, KBO (Korea), NPB (Japan), MiLB, and NCAA college baseball. Real-time box scores, standings, and schedules updated every 15 seconds.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Live Baseball Scores — MLB, KBO, NPB & More',
    description: 'Live baseball scores from MLB, KBO, NPB, MiLB, and college baseball. Real-time results updated every 15 seconds.',
    url: SITE_URL,
    siteName: 'Play-O-Graph',
    type: 'website',
  },
};

export default function ScoresPage() {
  return (
    <>
      <article className="sr-only">
        <h1>Live Baseball Scores — All Leagues</h1>
        <p>
          Live baseball scores and results from leagues around the world. Follow MLB (Major League Baseball),
          KBO (Korean Baseball Organization), NPB (Nippon Professional Baseball), MiLB (Minor League Baseball),
          and NCAA college baseball — all in one place. Scores update automatically every 15 seconds during live games.
        </p>
        <nav aria-label="Browse scores by league">
          <ul>
            <li><a href="/mlb">MLB Scores — Major League Baseball</a></li>
            <li><a href="/npb">NPB Scores — Nippon Professional Baseball (Japan)</a></li>
            <li><a href="/kbo">KBO Scores — Korean Baseball Organization</a></li>
            <li><a href="/milb">MiLB Scores — Minor League Baseball</a></li>
            <li><a href="/ncaa">NCAA Scores — College Baseball</a></li>
          </ul>
        </nav>
      </article>
      <ScoresView />
    </>
  );
}
