import type { Metadata } from 'next';
import { LEAGUE_SEO, SITE_URL, leagueJsonLd, gamesJsonLd, todayFormatted } from '@/lib/leagueSEO';
import { fetchLeagueScores } from '@/lib/fetchLeagueScores';
import SingleLeagueScoresView from '@/components/SingleLeagueScoresView';

export const revalidate = 30;

const league = LEAGUE_SEO.kbo;

export async function generateMetadata(): Promise<Metadata> {
  const today = todayFormatted();
  const title = `KBO Scores Today (${today}) — Live Korean Baseball`;
  return {
    title,
    description: league.metaDescription,
    keywords: ['KBO scores', 'Korea baseball scores', 'Korean Baseball Organization', 'KBO standings', 'KBO scores today', 'Korean baseball'],
    alternates: { canonical: `${SITE_URL}/kbo` },
    openGraph: {
      title,
      description: league.metaDescription,
      url: `${SITE_URL}/kbo`,
      siteName: 'Play-O-Graph',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `KBO Scores Today (${today}) | Play-O-Graph`,
      description: league.metaDescription,
    },
  };
}

export default async function KBOPage() {
  const initialLeagues = await fetchLeagueScores('kbo');
  const allGames = initialLeagues.flatMap((l) => l.games);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(leagueJsonLd(league)) }}
      />
      {allGames.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(gamesJsonLd(allGames)) }}
        />
      )}
      <article className="sr-only">
        <h1>{league.h1}</h1>
        <p>{league.description}</p>
        <nav aria-label="Other leagues">
          <ul>
            <li><a href="/mlb">MLB Scores — Major League Baseball</a></li>
            <li><a href="/npb">NPB Scores — Nippon Professional Baseball (Japan)</a></li>
            <li><a href="/milb">MiLB Scores — Minor League Baseball</a></li>
            <li><a href="/ncaa">NCAA Scores — College Baseball</a></li>
          </ul>
        </nav>
      </article>
      <SingleLeagueScoresView slots={league.slots} initialLeagues={initialLeagues} leagueSlug="kbo" />
    </>
  );
}
