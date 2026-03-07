/**
 * WBC bracket-round classification from MLB Stats API gameType field.
 * Used by app/api/wbc/bracket/route.ts.
 *
 * MLB Stats API game types for WBC:
 *   D = Quarterfinal
 *   L = Semifinal
 *   W = Championship
 *   F = Pool Play (excluded from bracket)
 */

/**
 * Determines which bracket round a WBC game belongs to based on its gameType.
 * Returns null for pool-play games that should not appear in the bracket.
 */
export function getRoundFromGameType(gameType: string): string | null {
  switch (gameType) {
    case 'D': return 'Quarterfinal';
    case 'L': return 'Semifinal';
    case 'W': return 'Championship';
    default: return null;
  }
}
