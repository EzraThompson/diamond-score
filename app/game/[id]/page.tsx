import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import type { GameDetail } from '@/lib/types';

const GameDetailView = dynamic(() => import('@/components/game/GameDetailView'), {
  ssr: false,
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://diamondscore.app';

async function fetchGameDetail(id: string): Promise<GameDetail | null> {
  try {
    const res = await fetch(`${SITE_URL}/api/game/${id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<GameDetail>;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const game = await fetchGameDetail(params.id);

  if (!game) {
    return { title: 'Game | DiamondScore' };
  }

  const away = game.awayTeam.abbreviation;
  const home = game.homeTeam.abbreviation;
  const ogImageUrl = `${SITE_URL}/api/og/game/${params.id}`;

  let title: string;
  if (game.status === 'final' || game.status === 'live') {
    title = `${away} ${game.awayScore}, ${home} ${game.homeScore} · ${game.status === 'final' ? 'Final' : 'Live'} | DiamondScore`;
  } else {
    title = `${away} @ ${home} | DiamondScore`;
  }

  return {
    title,
    openGraph: {
      title,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: [ogImageUrl],
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: { id: string };
}) {
  const game = await fetchGameDetail(params.id);

  const jsonLd = game
    ? {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: `${game.awayTeam.name ?? game.awayTeam.abbreviation} at ${game.homeTeam.name ?? game.homeTeam.abbreviation}`,
        sport: 'Baseball',
        homeTeam: {
          '@type': 'SportsTeam',
          name: game.homeTeam.name ?? game.homeTeam.abbreviation,
        },
        awayTeam: {
          '@type': 'SportsTeam',
          name: game.awayTeam.name ?? game.awayTeam.abbreviation,
        },
        ...(game.venue ? { location: { '@type': 'Place', name: game.venue } } : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <GameDetailView id={parseInt(params.id, 10)} />
    </>
  );
}
