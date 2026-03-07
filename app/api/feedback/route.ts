import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST — submit feedback from the modal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, page, gameId } = body as {
      message?: string;
      page?: string;
      gameId?: string;
    };

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        message: message.trim(),
        page: page ?? null,
        gameId: gameId ?? null,
      },
    });

    return NextResponse.json({ id: feedback.id }, { status: 201 });
  } catch (err) {
    console.error('Feedback POST error:', err);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}

// GET — read feedback (admin only, requires ADMIN_KEY)
export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') ?? new URL(req.url).searchParams.get('key');
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolved = new URL(req.url).searchParams.get('resolved');
  const where = resolved === 'true' ? { resolved: true } : resolved === 'false' ? { resolved: false } : {};

  const items = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(items);
}
