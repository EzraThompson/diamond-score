export interface SlotMeta {
  key: string;
  endpoint: string;
  skeletonName: string;
  skeletonCount: number;
  displayName: string;
  displayAbbr: string;
}

export const SLOT_LIST: SlotMeta[] = [
  { key: 'wbc',  endpoint: '/api/scores/wbc',  skeletonName: 'WBC',              skeletonCount: 2, displayName: 'World Baseball Classic', displayAbbr: 'WBC' },
  { key: 'mlb',  endpoint: '/api/scores/mlb',  skeletonName: 'MLB',              skeletonCount: 3, displayName: 'MLB',                    displayAbbr: 'MLB' },
  { key: 'milb', endpoint: '/api/scores/milb', skeletonName: 'MiLB',             skeletonCount: 2, displayName: 'Minor League Baseball',  displayAbbr: 'MiLB' },
  { key: 'npb',  endpoint: '/api/scores/npb',  skeletonName: 'NPB',             skeletonCount: 2, displayName: 'NPB',                    displayAbbr: 'NPB' },
  { key: 'kbo',  endpoint: '/api/scores/kbo',  skeletonName: 'KBO',             skeletonCount: 2, displayName: 'KBO',                    displayAbbr: 'KBO' },
  { key: 'ncaa', endpoint: '/api/scores/ncaa', skeletonName: 'College Baseball', skeletonCount: 2, displayName: 'College Baseball',       displayAbbr: 'COL' },
];

/**
 * Given a user's saved slot order (possibly empty, stale, or missing new slots),
 * return a valid ordering of SLOT_LIST entries.
 */
export function getOrderedSlots(savedOrder: string[]): SlotMeta[] {
  if (!savedOrder || savedOrder.length === 0) return SLOT_LIST;

  const slotMap = new Map(SLOT_LIST.map((s) => [s.key, s]));
  const ordered: SlotMeta[] = [];
  const seen = new Set<string>();

  for (const key of savedOrder) {
    const slot = slotMap.get(key);
    if (slot && !seen.has(key)) {
      ordered.push(slot);
      seen.add(key);
    }
  }

  // Append any slots not in the saved order (future-proofing)
  for (const slot of SLOT_LIST) {
    if (!seen.has(slot.key)) {
      ordered.push(slot);
    }
  }

  return ordered;
}
