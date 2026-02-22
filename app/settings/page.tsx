'use client';

import { useState, useEffect } from 'react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';
import TeamPicker from '@/components/TeamPicker';
import TeamBadge from '@/components/TeamBadge';
import { findTeam } from '@/lib/teamRegistry';
import { storageSet } from '@/lib/storage';
import type { NCAARankingsData, RankedCollegeTeam } from '@/lib/types';

// ── Toggle switch ──────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-accent' : 'bg-surface-300'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">
        {title}
      </h3>
      <div className="bg-surface-50 rounded-xl border border-surface-200 mx-4 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  sublabel,
  right,
  last = false,
}: {
  label: string;
  sublabel?: string;
  right: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        !last ? 'border-b border-surface-200' : ''
      }`}
    >
      <div className="flex-1 min-w-0 pr-3">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sublabel && (
          <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>
        )}
      </div>
      {right}
    </div>
  );
}

// ── League row ────────────────────────────────────────────────────────
const KNOWN_LEAGUES = [
  { id: 1, name: 'MLB', abbr: 'MLB' },
  { id: 2, name: 'NPB', abbr: 'NPB' },
  { id: 3, name: 'KBO', abbr: 'KBO' },
  { id: 16, name: 'College Baseball', abbr: 'COL' },
];

function LeagueRow({
  leagueId,
  leagueName,
  leagueAbbr,
  last,
}: {
  leagueId: number;
  leagueName: string;
  leagueAbbr: string;
  last?: boolean;
}) {
  const { settings, toggleLeagueVisibility } = useSettings();
  const hidden = settings.hiddenLeagues.includes(leagueId);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        !last ? 'border-b border-surface-200' : ''
      }`}
    >
      <div className="w-7 h-7 rounded-lg bg-surface-200 flex items-center justify-center flex-shrink-0">
        <span className="text-[8px] font-bold text-gray-600">{leagueAbbr}</span>
      </div>
      <span className="flex-1 text-sm font-medium text-gray-800">{leagueName}</span>
      <Toggle checked={!hidden} onChange={() => toggleLeagueVisibility(leagueId)} />
    </div>
  );
}

// ── College Team Picker ────────────────────────────────────────────────

function CollegeTeamPicker({
  favoriteTeams,
  onToggle,
}: {
  favoriteTeams: Set<string>;
  onToggle: (abbr: string) => void;
}) {
  const [rankings, setRankings] = useState<RankedCollegeTeam[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/rankings/ncaa')
      .then((r) => r.ok ? r.json() as Promise<NCAARankingsData> : Promise.reject())
      .then((d) => setRankings(d.teams))
      .catch(() => setRankings([]));
  }, []);

  const filtered = (rankings ?? []).filter((t) => {
    const q = query.toLowerCase();
    return !q || t.abbreviation.toLowerCase().includes(q) || t.displayName.toLowerCase().includes(q);
  });

  if (rankings === null) {
    return (
      <div className="px-4 py-6 flex justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <p className="px-4 py-4 text-xs text-gray-400 text-center">
        Rankings unavailable — check back during the season.
      </p>
    );
  }

  return (
    <div className="px-4 pb-4">
      {/* Search */}
      <div className="relative mt-3 mb-3">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search top 25…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-100 border border-surface-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-accent"
        />
      </div>

      {/* Team list */}
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {filtered.map((team) => {
          const isFav = favoriteTeams.has(team.abbreviation);
          return (
            <button
              key={team.id}
              onClick={() => onToggle(team.abbreviation)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left ${
                isFav ? 'bg-accent/10 ring-1 ring-accent' : 'hover:bg-surface-100'
              }`}
            >
              <span className="text-[10px] font-bold text-gray-400 w-5 text-right flex-shrink-0">
                #{team.rank}
              </span>
              <TeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{team.displayName}</p>
                <p className="text-[10px] text-gray-400">
                  {team.conference ? `${team.conference} · ` : ''}{team.wins}–{team.losses}
                </p>
              </div>
              {isFav && (
                <svg className="w-4 h-4 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No teams found</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { favoriteTeams, toggleTeam } = useFavorites();
  const { settings, updateSettings } = useSettings();
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [showCollegePicker, setShowCollegePicker] = useState(false);

  // Pro teams (in static registry)
  const favProTeams = Array.from(favoriteTeams)
    .map((abbr) => findTeam(abbr))
    .filter(Boolean);

  // College teams tracked via rankings (anything in favoriteTeams not in registry)
  const favCollegeAbbrs = Array.from(favoriteTeams).filter(
    (abbr) => !findTeam(abbr),
  );

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function resetOnboarding() {
    storageSet('onboarded', false);
    window.location.reload();
  }

  return (
    <div className="pt-4 pb-8 overflow-y-auto">
      <h1 className="text-base font-extrabold text-gray-900 px-4 mb-5">Settings</h1>

      {/* Following — Pro teams */}
      <Section title="Following">
        {/* Pro team chips */}
        {favProTeams.length > 0 && (
          <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-surface-200">
            {favProTeams.map((team) =>
              team ? (
                <button
                  key={team.abbreviation}
                  onClick={() => toggleTeam(team.abbreviation)}
                  title={`Unfollow ${team.name}`}
                  className="flex items-center gap-1.5 bg-surface-100 rounded-lg px-2 py-1 hover:bg-surface-200 transition-colors"
                >
                  <TeamBadge
                    abbreviation={team.abbreviation}
                    primaryColor={team.primaryColor}
                  />
                  <span className="text-xs font-semibold text-gray-700">
                    {team.abbreviation}
                  </span>
                  <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ) : null,
            )}
          </div>
        )}

        {/* Pro team picker toggle */}
        <button
          onClick={() => setShowTeamPicker((v) => !v)}
          className="flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-surface-100 transition-colors"
        >
          <span className="text-sm font-medium text-accent">
            {showTeamPicker ? 'Done' : '+ Add pro teams'}
          </span>
        </button>

        {showTeamPicker && (
          <div className="px-4 pb-4 border-t border-surface-200">
            <div className="pt-3">
              <TeamPicker selectedTeams={favoriteTeams} onToggle={toggleTeam} />
            </div>
          </div>
        )}
      </Section>

      {/* Following — College teams */}
      <Section title="College Baseball">
        {/* College team chips */}
        {favCollegeAbbrs.length > 0 && (
          <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-surface-200">
            {favCollegeAbbrs.map((abbr) => (
              <button
                key={abbr}
                onClick={() => toggleTeam(abbr)}
                title={`Unfollow ${abbr}`}
                className="flex items-center gap-1.5 bg-surface-100 rounded-lg px-2 py-1 hover:bg-surface-200 transition-colors"
              >
                <TeamBadge abbreviation={abbr} />
                <span className="text-xs font-semibold text-gray-700">{abbr}</span>
                <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* College team picker toggle */}
        <button
          onClick={() => setShowCollegePicker((v) => !v)}
          className="flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-surface-100 transition-colors"
        >
          <span className="text-sm font-medium text-accent">
            {showCollegePicker ? 'Done' : '+ Add college teams'}
          </span>
          {!showCollegePicker && (
            <span className="text-xs text-gray-400">Top 25</span>
          )}
        </button>

        {showCollegePicker && (
          <div className="border-t border-surface-200">
            <CollegeTeamPicker favoriteTeams={favoriteTeams} onToggle={toggleTeam} />
          </div>
        )}
      </Section>

      {/* Leagues */}
      <Section title="Leagues">
        {KNOWN_LEAGUES.map((l, i) => (
          <LeagueRow
            key={l.id}
            leagueId={l.id}
            leagueName={l.name}
            leagueAbbr={l.abbr}
            last={i === KNOWN_LEAGUES.length - 1}
          />
        ))}
      </Section>

      {/* Display */}
      <Section title="Display">
        <Row
          label="Spoiler mode"
          sublabel="Hide final scores until tapped"
          right={
            <Toggle
              checked={settings.spoilerMode}
              onChange={(v) => updateSettings({ spoilerMode: v })}
            />
          }
        />
        <Row
          label="Timezone"
          sublabel="Game times are shown in your local time"
          right={
            <span className="text-xs text-gray-500 font-mono">{tz}</span>
          }
          last
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row
          label="Game alerts"
          sublabel="Push notifications — coming soon"
          right={<Toggle checked={false} onChange={() => {}} />}
          last
        />
      </Section>

      {/* About */}
      <Section title="About">
        <Row
          label="Version"
          right={<span className="text-xs text-gray-400">1.0.0</span>}
        />
        <Row
          label="Reset onboarding"
          sublabel="Re-run the first-time team picker"
          right={
            <button
              onClick={resetOnboarding}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Reset
            </button>
          }
          last
        />
      </Section>
    </div>
  );
}
