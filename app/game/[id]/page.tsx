import GameDetailView from '@/components/game/GameDetailView';

export default function GamePage({ params }: { params: { id: string } }) {
  return <GameDetailView id={parseInt(params.id, 10)} />;
}
