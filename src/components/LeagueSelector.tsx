"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);
  const activeLeagueName = LEAGUES.find(l => l.slug === activeLeague)?.name;

  return (
    <div className="w-full border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="container mx-auto px-4">
        
        {/* Mobile Header (Hamburger) */}
        <div className="lg:hidden flex items-center justify-between py-3">
          <span className="text-emerald-400 font-bold flex items-center gap-2">
            {activeLeagueName}
          </span>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Dropdown Menu (Mobile) / Horizontal Tabs (Desktop) */}
        <div className={cn(
          "lg:flex lg:gap-2 lg:py-4 lg:items-center overflow-x-auto scrollbar-none",
          isOpen ? "flex flex-col py-4 gap-2 border-t border-slate-800/50" : "hidden"
        )}>
          {LEAGUES.map((league) => (
            <button
              key={league.slug}
              onClick={() => {
                onSelect(league.slug);
                setIsOpen(false);
              }}
              className={cn(
                "px-4 py-2 rounded-xl lg:rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 text-left lg:text-center",
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
    </div>
  );
}
