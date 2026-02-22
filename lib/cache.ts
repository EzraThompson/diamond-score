import NodeCache from 'node-cache';

// Default TTL of 30 seconds for live game data
export const gameCache = new NodeCache({ stdTTL: 30, checkperiod: 10 });

// Longer TTL for standings (5 minutes)
export const standingsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Schedule data changes infrequently (15 minutes)
export const scheduleCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });
