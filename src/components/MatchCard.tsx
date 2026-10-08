"use client";

import { ESPNEvent } from "@/types/espn";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  event: ESPNEvent;
  leagueName?: string;
  leagueLogo?: string;
  onClick: (eventId: string) => void;
}

export function MatchCard({ event, leagueName, leagueLogo, onClick }: MatchCardProps) {
  const competition = event.competitions[0];
  const homeTeam = competition.competitors.find((c) => c.homeAway === "home")!;
  const awayTeam = competition.competitors.find((c) => c.homeAway === "away")!;
  const status = event.status;

  const isLive = status.type.state === "in";
  const isFinished = status.type.state === "post";
  const isScheduled = status.type.state === "pre";

  // Formatar data: "Hoje/Amanhã/Ontem/DD/MM - HH:MM"
  const eventDate = new Date(event.date);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getFullYear() === d2.getFullYear();

  let datePrefix = "";
  if (isSameDay(eventDate, today)) {
    datePrefix = "Hoje";
  } else if (isSameDay(eventDate, tomorrow)) {
    datePrefix = "Amanhã";
  } else if (isSameDay(eventDate, yesterday)) {
    datePrefix = "Ontem";
  } else {
    datePrefix = eventDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  const timeString = eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const formattedDate = `${datePrefix} - ${timeString}`;

  // Formatar nome da liga a partir do slug (ex: "2024-25-english-premier-league" -> "English Premier League")
  const formatSeasonSlug = (slug: string) => {
    if (!slug) return "Competição";
    const parts = slug.split("-");
    const nameParts = parts.filter(p => isNaN(Number(p))); // Remove anos
    return nameParts.join(" ").replace("english", "ENG").replace("brazilian", "BRA");
  };

  const competitionName = leagueName !== "🏠 Home" && leagueName ? leagueName : formatSeasonSlug((event as any).season?.slug);

  return (
    <div 
      onClick={() => onClick(event.id)}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all group relative overflow-hidden flex flex-col justify-between"
    >
      {/* Status Bar Top */}
      <div className="flex justify-between items-center mb-4">
        <span 
          className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[200px] flex items-center gap-1.5"
          title={competitionName}
        >
          {leagueLogo ? (
            <img src={leagueLogo} alt={competitionName} className="w-4 h-4 object-contain" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
          )}
          {competitionName}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {status.displayClock}
            </span>
          )}
          {isFinished && (
            <span className="text-xs font-medium text-slate-500">
              {formattedDate} | Fim
            </span>
          )}
          {isScheduled && (
            <span className="text-xs font-medium text-emerald-400">
              {formattedDate}
            </span>
          )}
        </div>
      </div>

      {/* Teams and Score */}
      <div className="flex justify-between items-center">
        {/* Home Team */}
        <div className="flex flex-col items-center gap-2 flex-1" title={homeTeam.team.name}>
          <div className="w-12 h-12 relative flex items-center justify-center">
            {homeTeam.team.logo ? (
              <img src={homeTeam.team.logo} alt={homeTeam.team.name} className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800" />
            )}
          </div>
          <span className="text-sm font-semibold text-slate-200 text-center line-clamp-1">
            {homeTeam.team.shortDisplayName}
          </span>
        </div>

        {/* Score Area */}
        <div className="flex flex-col items-center justify-center px-4 flex-1">
          {!isScheduled ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white">{homeTeam.score}</span>
              <span className="text-slate-600">-</span>
              <span className="text-3xl font-bold text-white">{awayTeam.score}</span>
            </div>
          ) : (
            <span className="text-xl font-bold text-slate-600">VS</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center gap-2 flex-1" title={awayTeam.team.name}>
          <div className="w-12 h-12 relative flex items-center justify-center">
            {awayTeam.team.logo ? (
              <img src={awayTeam.team.logo} alt={awayTeam.team.name} className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800" />
            )}
          </div>
          <span className="text-sm font-semibold text-slate-200 text-center line-clamp-1">
            {awayTeam.team.shortDisplayName}
          </span>
        </div>
      </div>
    </div>
  );
}
