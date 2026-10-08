"use client";

import { cn } from "@/lib/utils";

export const LEAGUES = [
  { slug: "all", name: "🏠 Home" },
  { slug: "uefa.champions", name: "Champions League" },
  { slug: "conmebol.libertadores", name: "Libertadores" },
  { slug: "eng.1", name: "Premier League" },
  { slug: "bra.1", name: "Brasileirão Série A" },
  { slug: "esp.1", name: "La Liga" },
  { slug: "ger.1", name: "Bundesliga" },
  { slug: "ita.1", name: "Serie A" },
];

interface LeagueSelectorProps {
  activeLeague: string;
  onSelect: (slug: string) => void;
}

export function LeagueSelector({ activeLeague, onSelect }: LeagueSelectorProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-none py-4 border-b border-slate-800/50">
      <div className="container mx-auto px-4 flex gap-2">
        {LEAGUES.map((league) => (
          <button
            key={league.slug}
            onClick={() => onSelect(league.slug)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
              activeLeague === league.slug
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            )}
          >
            {league.name}
          </button>
        ))}
      </div>
    </div>
  );
}
