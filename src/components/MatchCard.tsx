"use client";

import { useEffect, useRef, useState } from "react";
import { ESPNEvent } from "@/types/espn";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  event: ESPNEvent;
  leagueName?: string;
  leagueLogo?: string;
  onClick: (eventId: string) => void;
  isDimmed?: boolean;
}

export function MatchCard({ event, leagueName, leagueLogo, onClick, isDimmed }: MatchCardProps) {
  const competition = event.competitions[0];
  const homeTeam = competition.competitors.find((c) => c.homeAway === "home")!;
  const awayTeam = competition.competitors.find((c) => c.homeAway === "away")!;
  const status = event.status;

  const isLive = status.type.state === "in";
  const isFinished = status.type.state === "post";
  const isScheduled = status.type.state === "pre";

  // Identificação de Intervalo no jogo ao vivo
  const isHalftime = 
    status.type.name === "STATUS_HALFTIME" ||
    status.type.id === "23" ||
    status.type.shortDetail === "INT" ||
    status.type.shortDetail === "HT" ||
    status.type.detail?.toLowerCase().includes("intervalo") ||
    status.type.shortDetail?.toLowerCase().includes("intervalo") ||
    status.type.description?.toLowerCase().includes("intervalo") ||
    status.type.description?.toLowerCase().includes("halftime") ||
    status.type.detail?.toLowerCase().includes("halftime");

  // Identificação de disputa de Pênaltis
  const hasShootout = 
    (homeTeam.shootoutScore !== undefined && awayTeam.shootoutScore !== undefined) ||
    status.type.name?.includes("PEN") ||
    status.type.description?.toLowerCase().includes("penalt") ||
    status.type.detail?.toLowerCase().includes("pen") ||
    status.type.shortDetail?.toLowerCase().includes("pen");

  const homeShootout = homeTeam.shootoutScore;
  const awayShootout = awayTeam.shootoutScore;
  const showShootoutScores = hasShootout && homeShootout !== undefined && awayShootout !== undefined;

  // Prevenção de hidratação e relógio ao vivo para contagem regressiva
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setMounted(true);
    if (!isScheduled) return;
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isScheduled]);

  // Monitoramento de Gols e VAR em tempo real
  const [goalAlert, setGoalAlert] = useState<boolean>(false);
  const [goalSide, setGoalSide] = useState<"home" | "away" | null>(null);
  const [varAlert, setVarAlert] = useState<boolean>(false);
  const prevScoresRef = useRef<{ home: string; away: string } | null>(null);

  const homeScoreStr = homeTeam.score ?? "0";
  const awayScoreStr = awayTeam.score ?? "0";

  useEffect(() => {
    if (isLive) {
      if (prevScoresRef.current !== null) {
        const prevHome = parseInt(prevScoresRef.current.home, 10) || 0;
        const prevAway = parseInt(prevScoresRef.current.away, 10) || 0;
        const currHome = parseInt(homeScoreStr, 10) || 0;
        const currAway = parseInt(awayScoreStr, 10) || 0;

        if (currHome > prevHome) {
          setVarAlert(false);
          setGoalAlert(true);
          setGoalSide("home");
          const t = setTimeout(() => {
            setGoalAlert(false);
            setGoalSide(null);
          }, 12000);
          return () => clearTimeout(t);
        } else if (currAway > prevAway) {
          setVarAlert(false);
          setGoalAlert(true);
          setGoalSide("away");
          const t = setTimeout(() => {
            setGoalAlert(false);
            setGoalSide(null);
          }, 12000);
          return () => clearTimeout(t);
        } else if (currHome < prevHome || currAway < prevAway) {
          // Placar diminuiu durante o jogo = Gol anulado pelo VAR
          setGoalAlert(false);
          setGoalSide(null);
          setVarAlert(true);
          const t = setTimeout(() => {
            setVarAlert(false);
          }, 12000);
          return () => clearTimeout(t);
        }
      }
      prevScoresRef.current = { home: homeScoreStr, away: awayScoreStr };
    }
  }, [homeScoreStr, awayScoreStr, isLive]);

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

  // Cálculo da contagem regressiva para jogos prestes a começar
  const diffMs = eventDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  // Menos de 1 hora para começar (contagem regressiva: "Começa em MM:SS")
  const isLessThan1Hour = mounted && isScheduled && diffMs > 0 && diffMs < 60 * 60 * 1000;
  // Menos de 2 horas (e pelo menos 1 hora) para começar ("Daqui a pouco - HH:MM")
  const isLessThan2Hours = mounted && isScheduled && diffMs >= 60 * 60 * 1000 && diffMs < 120 * 60 * 1000;
  // Passou do horário agendado mas ainda não iniciou oficialmente
  const isImminent = mounted && isScheduled && diffMs <= 0 && diffMs > -30 * 60 * 1000;

  const renderScheduledStatus = () => {
    if (isLessThan1Hour) {
      const minutesStr = String(Math.max(0, diffMinutes)).padStart(2, "0");
      const secondsStr = String(Math.max(0, diffSeconds)).padStart(2, "0");
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 dark:border-amber-400/20 whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-ping" />
          Começa em {minutesStr}:{secondsStr}
        </span>
      );
    }

    if (isImminent) {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 dark:border-amber-400/30 animate-pulse whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
          Aguarde o início
        </span>
      );
    }

    if (isLessThan2Hours) {
      return (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
          Daqui a pouco - {timeString}
        </span>
      );
    }

    return (
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
        {formattedDate}
      </span>
    );
  };

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
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between shadow-xs dark:shadow-none",
        isDimmed && "opacity-60 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700/80 filter grayscale-[15%] hover:grayscale-0",
        goalAlert && "ring-2 ring-emerald-500 dark:ring-emerald-400 border-emerald-500 dark:border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)] bg-white dark:bg-slate-900 animate-pulse",
        varAlert && "ring-2 ring-rose-500 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.35)] bg-white dark:bg-slate-900 animate-pulse"
      )}
    >
      {/* Status Bar Top */}
      <div className="flex justify-between items-center mb-4 gap-2">
        <span 
          className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate min-w-0 flex items-center gap-1.5"
          title={competitionName}
        >
          {leagueLogo ? (
            <img src={leagueLogo} alt={competitionName} className="w-4 h-4 object-contain shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
          )}
          <span className="truncate">{competitionName}</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {isLive && (
            isHalftime ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 dark:border-amber-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                Intervalo
              </span>
            ) : (
              <span className={cn(
                "flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full transition-colors",
                goalAlert 
                  ? "bg-emerald-500 text-slate-950 font-black" 
                  : "text-rose-600 dark:text-rose-500 bg-rose-500/10"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  goalAlert ? "bg-slate-950" : "bg-rose-500"
                )} />
                {status.displayClock && status.displayClock !== "0'" ? status.displayClock : (status.type.shortDetail || "Ao Vivo")}
              </span>
            )
          )}
          {isFinished && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {formattedDate} | Fim
            </span>
          )}
          {isScheduled && renderScheduledStatus()}
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
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800" />
            )}
          </div>
          <span className={cn(
            "text-sm font-semibold text-center line-clamp-1 transition-colors",
            goalSide === "home" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-800 dark:text-slate-200"
          )}>
            {homeTeam.team.shortDisplayName}
          </span>
        </div>

        {/* Score Area */}
        <div className="flex flex-col items-center justify-center px-4 flex-1 relative">
          {/* Alerta animado de GOL! ou GOL ANULADO (VAR) - Centralizado sobre o placar */}
          {goalAlert && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-xl animate-bounce whitespace-nowrap">
              <span className="text-xs">⚽</span> GOL!
            </div>
          )}
          {varAlert && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-white font-black text-[10px] uppercase tracking-wider shadow-xl animate-bounce whitespace-nowrap">
              <span>🖥️</span> GOL ANULADO (VAR)
            </div>
          )}
          {!isScheduled ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-3xl font-bold transition-all duration-300",
                  goalSide === "home" 
                    ? "text-emerald-600 dark:text-emerald-400 scale-125 font-black drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" 
                    : "text-slate-900 dark:text-white"
                )}>
                  {homeTeam.score}
                </span>
                <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>
                <span className={cn(
                  "text-3xl font-bold transition-all duration-300",
                  goalSide === "away" 
                    ? "text-emerald-600 dark:text-emerald-400 scale-125 font-black drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" 
                    : "text-slate-900 dark:text-white"
                )}>
                  {awayTeam.score}
                </span>
              </div>
              {showShootoutScores && (
                <div className="flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 dark:border-amber-400/25 mt-1.5">
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 min-w-3 text-right">
                    {homeShootout}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 dark:bg-amber-400/20 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none">
                    PK
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 min-w-3 text-left">
                    {awayShootout}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xl font-bold text-slate-300 dark:text-slate-600">VS</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center gap-2 flex-1" title={awayTeam.team.name}>
          <div className="w-12 h-12 relative flex items-center justify-center">
            {awayTeam.team.logo ? (
              <img src={awayTeam.team.logo} alt={awayTeam.team.name} className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800" />
            )}
          </div>
          <span className={cn(
            "text-sm font-semibold text-center line-clamp-1 transition-colors",
            goalSide === "away" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-800 dark:text-slate-200"
          )}>
            {awayTeam.team.shortDisplayName}
          </span>
        </div>
      </div>
    </div>
  );
}
