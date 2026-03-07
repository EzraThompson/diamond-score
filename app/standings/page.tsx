import type { Metadata } from 'next';
import StandingsView from '@/components/StandingsView';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://play-o-graph.com';

export const metadata: Metadata = {
  title: 'Baseball Standings — MLB, KBO, NPB, MiLB',
  description: 'Current baseball standings from MLB, KBO (Korea), NPB (Japan), and MiLB. Division standings, win-loss records, games back, streaks, and more.',
  alternates: { canonical: `${SITE_URL}/standings` },
  openGraph: {
    title: 'Baseball Standings — MLB, KBO, NPB, MiLB',
    description: 'Current baseball standings from MLB, KBO, NPB, and MiLB.',
    url: `${SITE_URL}/standings`,
    siteName: 'Play-O-Graph',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Baseball Standings — MLB, KBO, NPB, MiLB | Play-O-Graph',
    description: 'Current baseball standings from MLB, KBO, NPB, and MiLB.',
  },
};

export default function StandingsPage() {
  return (
    <>
      <article className="sr-only">
        <h1>Baseball Standings — All Leagues</h1>
        <p>
          Current standings from MLB (American League and National League divisions),
          KBO (Korean Baseball Organization), NPB (Nippon Professional Baseball Central and Pacific Leagues),
          and MiLB (Minor League Baseball). View win-loss records, winning percentage, games back, streaks, and last 10 results.
        </p>
      </article>
      <StandingsView />
    </>
  );
}
