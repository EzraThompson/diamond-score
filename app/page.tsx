import type { Metadata } from 'next';
import ScoresView from '@/components/ScoresView';

export const metadata: Metadata = {
  title: 'Live Baseball Scores | DiamondScore',
  description: 'Live MLB, NPB, KBO, MiLB scores. Updated in real time.',
};

export default function ScoresPage() {
  return <ScoresView />;
}
