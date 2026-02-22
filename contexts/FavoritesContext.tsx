'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { storageGet, storageSet } from '@/lib/storage';

interface FavoritesContextValue {
  favoriteTeams: Set<string>;
  favoriteLeagues: Set<number>;
  toggleTeam: (abbr: string) => void;
  toggleLeague: (id: number) => void;
  isTeamFav: (abbr: string) => boolean;
  isLeagueFav: (id: number) => boolean;
}

const Ctx = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteTeams, setFavoriteTeams] = useState<Set<string>>(
    () => new Set(storageGet<string[]>('fav:teams', [])),
  );
  const [favoriteLeagues, setFavoriteLeagues] = useState<Set<number>>(
    () => new Set(storageGet<number[]>('fav:leagues', [])),
  );

  const toggleTeam = useCallback((abbr: string) => {
    setFavoriteTeams((prev) => {
      const next = new Set(prev);
      next.has(abbr) ? next.delete(abbr) : next.add(abbr);
      storageSet('fav:teams', Array.from(next));
      return next;
    });
  }, []);

  const toggleLeague = useCallback((id: number) => {
    setFavoriteLeagues((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      storageSet('fav:leagues', Array.from(next));
      return next;
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        favoriteTeams,
        favoriteLeagues,
        toggleTeam,
        toggleLeague,
        isTeamFav: (abbr) => favoriteTeams.has(abbr),
        isLeagueFav: (id) => favoriteLeagues.has(id),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
