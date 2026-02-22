import { NextRequest, NextResponse } from 'next/server';
import { buildScores } from '@/lib/buildScores';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  try {
    const result = await buildScores(date);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Scores API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    );
  }
}
