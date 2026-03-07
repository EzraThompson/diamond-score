import type { Metadata } from 'next';
import ScheduleView from '@/components/schedule/ScheduleView';

export const metadata: Metadata = {
  title: 'Baseball Schedule | Play-o-Graph',
  description: 'Upcoming games with probable pitchers.',
};

export default function SchedulePage() {
  return <ScheduleView />;
}
