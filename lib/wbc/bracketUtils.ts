/**
 * Pure bracket-round classification logic, extracted for testability.
 * Used by app/api/wbc/bracket/route.ts.
 */

export interface BracketCompetition {
  type?: { abbreviation?: string };
  notes?: { type: string; headline: string }[];
}

export interface BracketEvent {
  competitions: BracketCompetition[];
}

/**
 * Determines which bracket round a WBC game belongs to.
 * Returns null for pool-play games that should not appear in the bracket.
 *
 * Priority:
 *   1. ESPN competition type abbreviation (QF / SF / F / CH)
 *   2. Note headline keywords (quarterfinal / semifinal / championship)
 *
 * Intentionally does NOT match:
 *   - "world baseball classic" — appears in ALL WBC game notes, not bracket-specific
 *   - "final" alone — could appear in pool-play game notes
 *   - season.type === 3 — applies to every WBC game, not just bracket
 */
export function getRound(event: BracketEvent): string | null {
  const comp = event.competitions[0];
  if (!comp) return null;

  // Check competition type abbreviation first (most reliable)
  const typeAbbr = comp.type?.abbreviation?.toLowerCase() ?? '';
  if (typeAbbr === 'f' || typeAbbr === 'ch' || typeAbbr === 'final') return 'Championship';
  if (typeAbbr === 'sf') return 'Semifinal';
  if (typeAbbr === 'qf') return 'Quarterfinal';

  // Fall back to note headline keywords (specific round terms only)
  const headline = comp.notes?.[0]?.headline?.toLowerCase() ?? '';
  if (headline.includes('championship')) return 'Championship';
  if (headline.includes('semifinal') || headline.includes('semi final')) return 'Semifinal';
  if (headline.includes('quarterfinal') || headline.includes('quarter final')) return 'Quarterfinal';

  return null; // pool play — not bracket
}
