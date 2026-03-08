/**
 * Leverage Index (LI) Calculator
 *
 * Computes a simplified leverage index for live baseball games based on:
 *   - Run expectancy (RE24 matrix): 24 base-out states → expected remaining runs
 *   - Inning multiplier: later innings amplify leverage
 *   - Score closeness: tight games are higher leverage
 *   - Bottom-of-inning bonus: home batting = closer to game's end
 *
 * LI ≈ 1.0 is average. LI ≥ 2.0 is "clutch." LI ≥ 4.0 is extreme.
 */

import type { Game, RunnersOn } from './types';

// ── Types ────────────────────────────────────────────────────────────

export interface LeverageResult {
  leverageIndex: number;
  isClutch: boolean;
  intensity: 'normal' | 'high' | 'extreme';
}

const NONE: LeverageResult = { leverageIndex: 0, isClutch: false, intensity: 'normal' };

// ── RE24 Table (historical MLB 2010-2019 averages) ───────────────────
// Key: "{first}{second}{third}_{outs}"  e.g. "100_0" = runner on 1st, 0 outs

const RE24: Record<string, number> = {
  // 0 outs
  '000_0': 0.481, '100_0': 0.859, '010_0': 1.100, '001_0': 1.353,
  '110_0': 1.437, '101_0': 1.798, '011_0': 1.920, '111_0': 2.282,
  // 1 out
  '000_1': 0.254, '100_1': 0.509, '010_1': 0.664, '001_1': 0.950,
  '110_1': 0.884, '101_1': 1.130, '011_1': 1.352, '111_1': 1.544,
  // 2 outs
  '000_2': 0.098, '100_2': 0.224, '010_2': 0.319, '001_2': 0.363,
  '110_2': 0.429, '101_2': 0.478, '011_2': 0.525, '111_2': 0.736,
};

// Inning multiplier: index 0 = 1st inning … index 8 = 9th+
const INNING_MULT = [0.7, 0.8, 0.85, 0.9, 1.0, 1.1, 1.2, 1.4, 1.8];

// Score-closeness multiplier (absolute run differential → multiplier)
const CLOSENESS: Record<number, number> = { 0: 1.8, 1: 1.4, 2: 1.0, 3: 0.6 };

// ── Helpers ──────────────────────────────────────────────────────────

function runnersKey(r: RunnersOn): string {
  return `${r.first ? 1 : 0}${r.second ? 1 : 0}${r.third ? 1 : 0}`;
}

// ── Public API ───────────────────────────────────────────────────────

export function calculateLeverageIndex(game: Game): LeverageResult {
  if (game.status !== 'live' || game.currentInning == null) return NONE;

  const runners = game.runnersOn ?? { first: false, second: false, third: false };
  const outs = game.count?.outs ?? game.outs ?? 0;
  const inning = Math.min(game.currentInning, 9);
  const isBottom = game.inningHalf === 'bottom';
  const scoreDiff = Math.abs(game.homeScore - game.awayScore);

  // Look up run expectancy for current base-out state
  const re = RE24[`${runnersKey(runners)}_${outs}`] ?? 0.481;

  // Combine multipliers
  const inningMult = INNING_MULT[inning - 1];
  const closenessMult = CLOSENESS[scoreDiff] ?? 0.3;
  const halfMult = isBottom ? 1.15 : 1.0;
  const runnerAmp = 1.0 + re * 0.8;

  const li = Math.round(inningMult * closenessMult * halfMult * runnerAmp * 100) / 100;

  return {
    leverageIndex: li,
    isClutch: li >= 2.0,
    intensity: li >= 4.0 ? 'extreme' : li >= 2.0 ? 'high' : 'normal',
  };
}
