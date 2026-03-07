import type { Metadata } from 'next';
import { LEAGUE_SEO, SITE_URL, leagueJsonLd } from '@/lib/leagueSEO';
import { fetchLeagueScores } from '@/lib/fetchLeagueScores';
import SingleLeagueScoresView from '@/components/SingleLeagueScoresView';

export const revalidate = 30;

const league = LEAGUE_SEO.mlb;

export const metadata: Metadata = {
  title: `${league.name} Scores Today — ${league.fullName} Live Results`,
  description: league.metaDescription,
  keywords: ['MLB scores', 'baseball scores', 'Major League Baseball', 'MLB standings', 'MLB scores today', 'live baseball scores'],
  alternates: { canonical: `${SITE_URL}/mlb` },
  openGraph: {
    title: `${league.name} Scores Today — ${league.fullName} Live Results`,
    description: league.metaDescription,
    url: `${SITE_URL}/mlb`,
    siteName: 'Play-O-Graph',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${league.name} Scores Today | Play-O-Graph`,
    description: league.metaDescription,
  },
};

export default async function MLBPage() {
  const initialLeagues = await fetchLeagueScores('mlb');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(leagueJsonLd(league)) }}
      />
      <article className="sr-only">
        <h1>{league.h1}</h1>
        <p>{league.description}</p>
        <nav aria-label="Other leagues">
          <ul>
            <li><a href="/kbo">KBO Scores — Korean Baseball Organization</a></li>
            <li><a href="/npb">NPB Scores — Nippon Professional Baseball (Japan)</a></li>
            <li><a href="/milb">MiLB Scores — Minor League Baseball</a></li>
            <li><a href="/ncaa">NCAA Scores — College Baseball</a></li>
          </ul>
        </nav>
      </article>
      <SingleLeagueScoresView slots={league.slots} initialLeagues={initialLeagues} />
    </>
  );
}
