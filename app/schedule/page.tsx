import type { Metadata } from 'next';
import ScheduleView from '@/components/schedule/ScheduleView';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://play-o-graph.com';

export const metadata: Metadata = {
  title: 'Baseball Schedule — Upcoming Games & Probable Pitchers',
  description: 'Upcoming baseball games and probable pitchers from MLB, KBO, NPB, MiLB, and college baseball. View game times, matchups, and starting pitchers.',
  alternates: { canonical: `${SITE_URL}/schedule` },
  openGraph: {
    title: 'Baseball Schedule — Upcoming Games & Probable Pitchers',
    description: 'Upcoming baseball games and probable pitchers from MLB, KBO, NPB, and more.',
    url: `${SITE_URL}/schedule`,
    siteName: 'Play-O-Graph',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Baseball Schedule — Upcoming Games | Play-O-Graph',
    description: 'Upcoming baseball games and probable pitchers from MLB, KBO, NPB, and more.',
  },
};

export default function SchedulePage() {
  return (
    <>
      <article className="sr-only">
        <h1>Baseball Schedule — Upcoming Games</h1>
        <p>
          View upcoming baseball games and probable starting pitchers across MLB, KBO, NPB, MiLB, and NCAA college baseball.
          Find game times, matchups, and pitching matchups for today and the coming week.
        </p>
      </article>
      <ScheduleView />
    </>
  );
}
