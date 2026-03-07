import { describe, it, expect } from 'vitest';
import { getRound, type BracketEvent } from '@/lib/wbc/bracketUtils';

// ── Helpers ───────────────────────────────────────────────────────────────

function makeEvent(opts: {
  typeAbbr?: string;
  headline?: string;
}): BracketEvent {
  return {
    competitions: [
      {
        type: opts.typeAbbr ? { abbreviation: opts.typeAbbr } : undefined,
        notes: opts.headline ? [{ type: 'event', headline: opts.headline }] : [],
      },
    ],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('getRound — type abbreviation (most reliable signal)', () => {
  it('returns Championship for type abbreviation "F"', () => {
    expect(getRound(makeEvent({ typeAbbr: 'F' }))).toBe('Championship');
  });

  it('returns Championship for type abbreviation "CH"', () => {
    expect(getRound(makeEvent({ typeAbbr: 'CH' }))).toBe('Championship');
  });

  it('returns Championship for type abbreviation "final" (case-insensitive)', () => {
    expect(getRound(makeEvent({ typeAbbr: 'final' }))).toBe('Championship');
  });

  it('returns Semifinal for type abbreviation "SF"', () => {
    expect(getRound(makeEvent({ typeAbbr: 'SF' }))).toBe('Semifinal');
  });

  it('returns Quarterfinal for type abbreviation "QF"', () => {
    expect(getRound(makeEvent({ typeAbbr: 'QF' }))).toBe('Quarterfinal');
  });
});

describe('getRound — headline keyword fallback', () => {
  it('returns Championship when headline contains "championship"', () => {
    expect(getRound(makeEvent({ headline: 'World Baseball Classic Championship' }))).toBe('Championship');
  });

  it('returns Semifinal when headline contains "semifinal"', () => {
    expect(getRound(makeEvent({ headline: 'WBC Semifinal - Game 1' }))).toBe('Semifinal');
  });

  it('returns Semifinal when headline contains "semi final" (two words)', () => {
    expect(getRound(makeEvent({ headline: 'Semi Final Round' }))).toBe('Semifinal');
  });

  it('returns Quarterfinal when headline contains "quarterfinal"', () => {
    expect(getRound(makeEvent({ headline: 'WBC Quarterfinal' }))).toBe('Quarterfinal');
  });

  it('returns Quarterfinal when headline contains "quarter final" (two words)', () => {
    expect(getRound(makeEvent({ headline: 'Quarter Final Game 3' }))).toBe('Quarterfinal');
  });
});

describe('getRound — pool play (must return null)', () => {
  it('returns null for a generic "World Baseball Classic" headline (pool play)', () => {
    // This was the bug: headline.includes('world baseball classic') matched ALL WBC games
    expect(getRound(makeEvent({ headline: 'World Baseball Classic' }))).toBeNull();
  });

  it('returns null for "World Baseball Classic - Pool A"', () => {
    expect(getRound(makeEvent({ headline: 'World Baseball Classic - Pool A' }))).toBeNull();
  });

  it('returns null for "World Baseball Classic Pool B Game 2"', () => {
    expect(getRound(makeEvent({ headline: 'World Baseball Classic Pool B Game 2' }))).toBeNull();
  });

  it('returns null when headline contains "final" alone (not "semifinal" or "quarterfinal")', () => {
    // "final" alone should NOT match — it could appear in pool play context
    // The rule: only "championship", "semifinal", "quarterfinal" are explicit
    expect(getRound(makeEvent({ headline: 'WBC Pool Play Final Standings' }))).toBeNull();
  });

  it('returns null with no competitions', () => {
    expect(getRound({ competitions: [] })).toBeNull();
  });

  it('returns null with no type abbreviation and no headline notes', () => {
    expect(getRound(makeEvent({}))).toBeNull();
  });

  it('returns null with no type abbreviation and an unrelated headline', () => {
    expect(getRound(makeEvent({ headline: 'Game 3 of the series' }))).toBeNull();
  });
});

describe('getRound — type abbreviation takes priority over headline', () => {
  it('uses type abbreviation even when headline is pool play', () => {
    // If ESPN marks it QF via type, it's a quarterfinal regardless of headline
    expect(
      getRound({
        competitions: [{
          type: { abbreviation: 'QF' },
          notes: [{ type: 'event', headline: 'World Baseball Classic Pool A' }],
        }],
      }),
    ).toBe('Quarterfinal');
  });
});
