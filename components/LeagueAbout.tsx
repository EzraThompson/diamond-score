'use client';

import { useState } from 'react';
import { LEAGUE_SEO } from '@/lib/leagueSEO';

const ABOUT_TEXT: Record<string, string> = {
  kbo: 'The Korean Baseball Organization (KBO) is South Korea\'s professional baseball league, founded in 1982. The KBO comprises 10 teams and runs from late March to October, with each team playing 144 regular season games. Play-O-Graph tracks all KBO scores in real time alongside MLB, NPB, MiLB, and NCAA baseball.',
  npb: 'Nippon Professional Baseball (NPB) is Japan\'s top professional baseball league, established in 1950. NPB features 12 teams split between the Central League and Pacific League. The regular season runs from late March to October, with each team playing 143 games. Play-O-Graph tracks all NPB scores in real time alongside MLB, KBO, MiLB, and NCAA baseball.',
  mlb: 'Major League Baseball (MLB) is the highest level of professional baseball in the United States and Canada. Founded in 1903, MLB features 30 teams across the American League and National League. The regular season runs from late March to early October, with each team playing 162 games. Play-O-Graph tracks all MLB scores in real time alongside KBO, NPB, MiLB, and NCAA baseball.',
  milb: 'Minor League Baseball (MiLB) is the development system for Major League Baseball, featuring teams at four levels: Triple-A, Double-A, High-A, and Single-A. MiLB showcases top prospects and future MLB stars across hundreds of teams. Play-O-Graph tracks MiLB scores in real time alongside MLB, KBO, NPB, and NCAA baseball.',
  ncaa: 'NCAA Division I College Baseball is the highest level of collegiate baseball in the United States, featuring over 300 programs competing for a spot in the College World Series in Omaha, Nebraska. The season runs from February through June. Play-O-Graph tracks NCAA baseball scores in real time alongside MLB, KBO, NPB, and MiLB.',
};

export default function LeagueAbout({ slug }: { slug: string }) {
  const [expanded, setExpanded] = useState(false);
  const league = LEAGUE_SEO[slug];
  const about = ABOUT_TEXT[slug];
  if (!league || !about) return null;

  return (
    <section className="mx-4 mb-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <span>About {league.fullName}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <p className="text-xs text-gray-500 pb-4 leading-relaxed">
          {about}
        </p>
      )}
    </section>
  );
}
