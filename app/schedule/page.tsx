import type { Metadata } from 'next';
import ScheduleView from '@/components/schedule/ScheduleView';

export const metadata: Metadata = {
  title: 'Baseball Schedule | DiamondScore',
  description: 'Upcoming games with probable pitchers.',
};

export default function SchedulePage() {
  return <ScheduleView />;
}
