import { NextRequest, NextResponse } from 'next/server';
import { createFeedback, listFeedback } from '@/lib/feedback-store';

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

    const feedback = createFeedback(message.trim(), page, gameId);
    return NextResponse.json({ id: feedback.id }, { status: 201 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Feedback POST error:', errMsg);
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
  const filter = resolved === 'true' ? { resolved: true } : resolved === 'false' ? { resolved: false } : undefined;

  const items = listFeedback(filter);
  return NextResponse.json(items);
}
