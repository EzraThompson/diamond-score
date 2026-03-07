import { describe, it, expect } from 'vitest';
import { getRoundFromGameType } from '@/lib/wbc/bracketUtils';

describe('getRoundFromGameType — MLB Stats API game type classification', () => {
  it('returns Quarterfinal for gameType "D"', () => {
    expect(getRoundFromGameType('D')).toBe('Quarterfinal');
  });

  it('returns Semifinal for gameType "L"', () => {
    expect(getRoundFromGameType('L')).toBe('Semifinal');
  });

  it('returns Championship for gameType "W"', () => {
    expect(getRoundFromGameType('W')).toBe('Championship');
  });

  it('returns null for pool play gameType "F"', () => {
    expect(getRoundFromGameType('F')).toBeNull();
  });

  it('returns null for unknown game types', () => {
    expect(getRoundFromGameType('R')).toBeNull();
    expect(getRoundFromGameType('S')).toBeNull();
    expect(getRoundFromGameType('')).toBeNull();
  });
});
