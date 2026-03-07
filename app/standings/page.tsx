import type { Metadata } from 'next';
import StandingsView from '@/components/StandingsView';

export const metadata: Metadata = {
  title: 'Baseball Standings | Play-o-Graph',
  description: 'MLB, MiLB, NPB, KBO standings.',
};

export default function StandingsPage() {
  return <StandingsView />;
}
