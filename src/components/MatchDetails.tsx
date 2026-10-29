"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMatchSummary } from "@/services/espnApi";
import { X, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MatchDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  leagueSlug: string;
}

export function MatchDetailsModal({ isOpen, onClose, eventId, leagueSlug }: MatchDetailsProps) {
  const queryClient = useQueryClient();
  const prevScoresRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["matchSummary", leagueSlug, eventId],
    queryFn: () => fetchMatchSummary(leagueSlug, eventId!),
    enabled: !!eventId && isOpen,
    refetchInterval: (query) => {
      // Se a partida estiver ao vivo ("in"), atualiza mais rápido (a cada 10s) para pegar gols/cartões
      const state = query.state.data?.header?.competitions?.[0]?.status?.type?.state;
      return state === "in" ? 10000 : 30000;
    },
  });

  // Sincroniza imediatamente o card primário em segundo plano se um gol for detectado no modal detalhado
  const homeScore = data?.header?.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === "home")?.score;
  const awayScore = data?.header?.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === "away")?.score;

  useEffect(() => {
    if (homeScore !== undefined && awayScore !== undefined) {
      const currentScoreKey = `${homeScore}-${awayScore}`;
      if (prevScoresRef.current !== null && prevScoresRef.current !== currentScoreKey) {
        queryClient.invalidateQueries({ queryKey: ["scoreboard"] });
      }
      prevScoresRef.current = currentScoreKey;
    }
  }, [homeScore, awayScore, queryClient]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed bottom-0 left-0 right-0 md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] md:rounded-2xl md:h-[80vh] h-[85vh] bg-slate-900 border-t md:border border-slate-800 z-50 flex flex-col shadow-2xl"
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-800 shrink-0">
              <h2 className="text-lg font-bold text-slate-100">Detalhes da Partida</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                  <p>Carregando informações...</p>
                </div>
              ) : error || !data ? (
                <div className="flex flex-col items-center justify-center h-full text-rose-500 text-center">
                  <p>Não foi possível carregar os detalhes.</p>
                </div>
              ) : (
                <MatchSummaryContent data={data as any} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MatchSummaryContent({ data }: { data: any }) {
  const [activeTab, setActiveTab] = useState<"resumo" | "estatisticas" | "escalacoes">("resumo");

  const header = data?.header?.competitions?.[0];
  if (!header) return <div className="text-slate-400">Nenhum dado disponível.</div>;

  const home = header.competitors.find((c: any) => c.homeAway === "home");
  const away = header.competitors.find((c: any) => c.homeAway === "away");
  const matchState = header.status.type.state; // "pre", "in", "post"
  
  // Identificação de Intervalo no modal
  const isHalftime = 
    header.status.type.name === "STATUS_HALFTIME" ||
    header.status.type.id === "23" ||
    header.status.type.shortDetail === "INT" ||
    header.status.type.shortDetail === "HT" ||
    header.status.type.detail?.toLowerCase().includes("intervalo") ||
    header.status.type.shortDetail?.toLowerCase().includes("intervalo") ||
    header.status.type.description?.toLowerCase().includes("intervalo") ||
    header.status.type.description?.toLowerCase().includes("halftime") ||
    header.status.type.detail?.toLowerCase().includes("halftime");

  // Identificação de Pênaltis no modal
  const hasShootout = 
    (home?.shootoutScore !== undefined && away?.shootoutScore !== undefined) ||
    header.status.type.name?.includes("PEN") ||
    header.status.type.description?.toLowerCase().includes("penalt") ||
    header.status.type.detail?.toLowerCase().includes("pen") ||
    header.status.type.shortDetail?.toLowerCase().includes("pen");

  const homeShootout = home?.shootoutScore;
  const awayShootout = away?.shootoutScore;
  const showShootoutScores = hasShootout && homeShootout !== undefined && awayShootout !== undefined;

  // Formatação de statusDisplay
  let statusDisplay = header.status.type.detail;
  if (isHalftime) {
    statusDisplay = "Intervalo";
  } else if (matchState === "post" && (hasShootout || statusDisplay?.toLowerCase().includes("pen"))) {
    statusDisplay = "Fim de jogo";
  } else if (matchState === "pre" && header.date) {
    statusDisplay = new Date(header.date).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(", ", " às ");
  }

  const homeEvents = parseTeamIncidents(data?.keyEvents, home?.id, home?.team?.name);
  const awayEvents = parseTeamIncidents(data?.keyEvents, away?.id, away?.team?.name);

  return (
    <div className="space-y-5">
      {/* Placar Gigante com Resumo de Eventos */}
      <div className="bg-slate-950 p-4 md:p-5 rounded-xl border border-slate-800 shadow-sm">
        <div className="flex justify-between items-center">
          <TeamDisplay team={home?.team} score={home?.score} isPreMatch={matchState === "pre"} align="left" />
          <div className="flex flex-col items-center px-4 gap-1.5">
            {isHalftime ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Intervalo
              </span>
            ) : showShootoutScores ? (
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                Pên: {homeShootout} - {awayShootout}
              </span>
            ) : null}
            <span className="text-sm font-medium text-slate-400 text-center">{statusDisplay}</span>
          </div>
          <TeamDisplay team={away?.team} score={away?.score} isPreMatch={matchState === "pre"} align="right" />
        </div>

        {/* Resumo compacto de Gols e Cartões */}
        <TeamEventsSummary homeEvents={homeEvents} awayEvents={awayEvents} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-800 pb-0">
        {[
          { id: "resumo", label: "Resumo" },
          { id: "estatisticas", label: "Estatísticas" },
          { id: "escalacoes", label: "Escalações" },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "font-medium pb-2 border-b-2 transition-colors",
              activeTab === tab.id 
                ? "text-emerald-400 border-emerald-400" 
                : "text-slate-500 border-transparent hover:text-slate-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="py-2">
        {activeTab === "resumo" && <TimelineTab keyEvents={data.keyEvents} matchState={matchState} />}
        {activeTab === "estatisticas" && <StatsTab boxscore={data.boxscore} homeId={home?.id} awayId={away?.id} matchState={matchState} />}
        {activeTab === "escalacoes" && <RostersTab rosters={data.rosters} homeId={home?.id} awayId={away?.id} matchState={matchState} />}
      </div>
    </div>
  );
}

interface TeamIncident {
  id: string;
  type: "goal" | "yellow-card" | "red-card";
  player: string;
  minute: string;
  clockValue: number;
}

function extractAthleteName(e: any): string {
  if (e.participants?.[0]?.athlete?.displayName) {
    return e.participants[0].athlete.displayName;
  }
  if (e.participants?.[0]?.athlete?.shortName) {
    return e.participants[0].athlete.shortName;
  }
  if (e.text) {
    const parts = e.text.split(".");
    for (const part of parts) {
      const m = part.match(/([^(\n]+?)\s*\(/);
      if (m && m[1]?.trim() && !m[1].toLowerCase().includes("gol") && !m[1].toLowerCase().includes("substituição")) {
        return m[1].trim();
      }
    }
    const fallbackMatch = e.text.match(/^([^(\n]+?)\s*\(/);
    if (fallbackMatch && fallbackMatch[1]?.trim()) {
      return fallbackMatch[1].trim();
    }
  }
  return "Jogador";
}

function parseTeamIncidents(keyEvents: any[] | undefined, teamId: string, teamName?: string): TeamIncident[] {
  if (!keyEvents || !Array.isArray(keyEvents)) {
    return [];
  }

  const incidents: TeamIncident[] = [];
  const sorted = [...keyEvents].sort((a, b) => (a.clock?.value ?? 0) - (b.clock?.value ?? 0));

  for (const e of sorted) {
    if (e.shootout === true || (e.penaltyKick && (e.clock?.value ?? 0) > 5400)) {
      continue;
    }

    const isTeamEvent = 
      e.team?.id === teamId ||
      (teamName && e.team?.displayName?.toLowerCase() === teamName.toLowerCase()) ||
      (!e.team?.id && teamName && e.text?.toLowerCase().includes(`(${teamName.toLowerCase()})`));

    if (!isTeamEvent) continue;

    const isGoal = 
      e.scoringPlay === true || 
      e.type?.type?.startsWith("goal") || 
      e.type?.type === "penalty---scored" || 
      e.type?.id === "70" || 
      e.type?.id === "98" || 
      e.type?.id === "173";

    const isYellow = 
      e.type?.type === "yellow-card" || 
      e.type?.id === "94" || 
      e.type?.text?.toLowerCase().includes("amarelo");

    const isRed = 
      e.type?.type === "red-card" || 
      e.type?.id === "93" || 
      e.type?.type === "second-yellow-card" || 
      e.type?.text?.toLowerCase().includes("vermelho");

    if (!isGoal && !isYellow && !isRed) continue;

    const playerName = extractAthleteName(e);
    let minute = e.clock?.displayValue || "";
    if (minute && !minute.endsWith("'")) minute += "'";

    const clockValue = e.clock?.value ?? 0;

    if (isGoal) {
      const isPenalty = e.type?.type === "penalty---scored" || e.type?.id === "98" || e.text?.toLowerCase().includes("pênalti");
      const isOwnGoal = e.type?.type === "own-goal" || e.text?.toLowerCase().includes("contra");
      let tag = "";
      if (isPenalty) tag = " (P)";
      if (isOwnGoal) tag = " (GC)";
      incidents.push({
        id: e.id || `goal-${clockValue}-${playerName}`,
        type: "goal",
        player: playerName,
        minute: `${minute}${tag}`.trim(),
        clockValue,
      });
    } else if (isRed) {
      incidents.push({
        id: e.id || `red-${clockValue}-${playerName}`,
        type: "red-card",
        player: playerName,
        minute,
        clockValue,
      });
    } else if (isYellow) {
      incidents.push({
        id: e.id || `yellow-${clockValue}-${playerName}`,
        type: "yellow-card",
        player: playerName,
        minute,
        clockValue,
      });
    }
  }

  // Ordenação cronológica estrita por tempo de jogo
  return incidents.sort((a, b) => a.clockValue - b.clockValue);
}

function TeamEventsSummary({ 
  homeEvents, 
  awayEvents 
}: { 
  homeEvents: TeamIncident[]; 
  awayEvents: TeamIncident[]; 
}) {
  if (homeEvents.length === 0 && awayEvents.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
      {/* Mandante (Alinhado à esquerda, em ordem cronológica) */}
      <div className="space-y-1 max-h-24 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {homeEvents.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 text-slate-200">
            {item.type === "goal" && <span className="text-xs shrink-0">⚽</span>}
            {item.type === "red-card" && <span className="w-2 h-2.5 bg-rose-500 rounded-[1.5px] inline-block shadow-sm shrink-0" />}
            {item.type === "yellow-card" && <span className="w-2 h-2.5 bg-amber-400 rounded-[1.5px] inline-block shadow-sm shrink-0" />}
            <span 
              className={cn(
                "truncate max-w-[125px] sm:max-w-[180px]",
                item.type === "goal" 
                  ? "font-semibold text-white" 
                  : item.type === "red-card" 
                  ? "font-semibold text-rose-200" 
                  : "font-medium text-slate-300"
              )} 
              title={item.player}
            >
              {item.player}
            </span>
            <span 
              className={cn(
                "text-[10px] font-mono shrink-0",
                item.type === "red-card" ? "text-rose-400/80" : "text-slate-400"
              )}
            >
              {item.minute}
            </span>
          </div>
        ))}
      </div>

      {/* Visitante (Alinhado à direita, em ordem cronológica) */}
      <div className="space-y-1 max-h-24 overflow-y-auto pl-1 scrollbar-thin scrollbar-thumb-slate-800">
        {awayEvents.map((item) => (
          <div key={item.id} className="flex items-center justify-end gap-1.5 text-slate-200">
            <span 
              className={cn(
                "text-[10px] font-mono shrink-0",
                item.type === "red-card" ? "text-rose-400/80" : "text-slate-400"
              )}
            >
              {item.minute}
            </span>
            <span 
              className={cn(
                "truncate max-w-[125px] sm:max-w-[180px]",
                item.type === "goal" 
                  ? "font-semibold text-white" 
                  : item.type === "red-card" 
                  ? "font-semibold text-rose-200" 
                  : "font-medium text-slate-300"
              )} 
              title={item.player}
            >
              {item.player}
            </span>
            {item.type === "goal" && <span className="text-xs shrink-0">⚽</span>}
            {item.type === "red-card" && <span className="w-2 h-2.5 bg-rose-500 rounded-[1.5px] inline-block shadow-sm shrink-0" />}
            {item.type === "yellow-card" && <span className="w-2 h-2.5 bg-amber-400 rounded-[1.5px] inline-block shadow-sm shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamDisplay({ team, score, isPreMatch, align }: { team: any; score: string; isPreMatch?: boolean; align: "left" | "right" }) {
  return (
    <div className={`flex flex-col items-center gap-3 flex-1`}>
      <div className="w-16 h-16 relative flex items-center justify-center">
        {team?.logos?.[0]?.href ? (
           <img src={team?.logos?.[0]?.href} alt={team?.name} className="w-16 h-16 object-contain" />
        ) : (
           <div className="w-16 h-16 rounded-full bg-slate-800" />
        )}
      </div>
      <div className="text-center">
        <span className="block text-sm font-bold text-slate-100">{team?.shortDisplayName || team?.name}</span>
      </div>
      <span className="text-4xl font-black text-white">{isPreMatch ? "-" : (score || "0")}</span>
    </div>
  );
}

// ---- TABS COMPONENTS ----

function getTimelineEventDetails(event: any) {
  const typeStr = event.type?.type || "";
  const typeId = String(event.type?.id || "");
  const typeText = (event.type?.text || "").toLowerCase();
  const isShootout = event.shootout === true || (event.penaltyKick && (event.clock?.value ?? 0) > 5400);

  const isKickoff = typeStr === "kickoff" || typeId === "80" || typeText.includes("começo") || typeText.includes("inicio") || typeText.includes("início");
  const isHalftime = typeStr === "halftime" || typeId === "81" || typeText.includes("intervalo");
  const isStart2ndHalf = typeStr === "start-2nd-half" || typeId === "82" || typeText.includes("começo do 2º") || typeText.includes("início do 2º") || typeText.includes("inicio do 2º");
  const isEndRegularTime = typeStr === "end-regular-time" || typeId === "83" || typeText.includes("fim do tempo regulamentar") || typeText.includes("fim do segundo tempo") || typeText.includes("fim de jogo");
  const isExtraTimeStart = typeStr === "start-extra-time" || typeText.includes("início da prorrogação");
  const isExtraTimeHalf = typeStr === "halftime-extra-time" || typeText.includes("intervalo da prorrogação");
  const isExtraTimeEnd = typeStr === "end-extra-time" || typeText.includes("fim da prorrogação");
  const isShootoutStart = typeStr === "shootout-start" || typeText.includes("disputa de pênaltis");

  const isPeriodEvent = isKickoff || isHalftime || isStart2ndHalf || isEndRegularTime || isExtraTimeStart || isExtraTimeHalf || isExtraTimeEnd || isShootoutStart;

  // Determinar texto principal descritivo
  let mainText = event.text?.trim() || "";
  if (!mainText) {
    if (isKickoff) mainText = "Início da partida.";
    else if (isHalftime) mainText = "Fim do primeiro tempo / Intervalo.";
    else if (isStart2ndHalf) mainText = "Início do segundo tempo.";
    else if (isEndRegularTime) mainText = "Fim do segundo tempo / Fim de jogo.";
    else if (isExtraTimeStart) mainText = "Início da prorrogação.";
    else if (isExtraTimeHalf) mainText = "Intervalo da prorrogação.";
    else if (isExtraTimeEnd) mainText = "Fim da prorrogação.";
    else if (isShootoutStart) mainText = "Início da disputa de pênaltis.";
    else if (event.type?.text) mainText = event.type.text;
  }

  // Se o texto for apenas "Começo" ou "Começo.", substituir por "Início da partida"
  if (mainText.toLowerCase() === "começo" || mainText.toLowerCase() === "começo.") {
    mainText = "Início da partida.";
  }

  // Correção de más traduções de "Delay in match" e "Delay over" da API
  mainText = mainText
    .replace(/^Jogo atrasado\b/i, "Jogo paralisado")
    .replace(/\bjogo atrasado\b/gi, "jogo paralisado")
    .replace(/^Partida atrasada\b/i, "Partida paralisada")
    .replace(/\bpartida atrasada\b/gi, "partida paralisada")
    .replace(/^Fim do atraso\b/i, "Partida reiniciada")
    .replace(/\bfim do atraso\b/gi, "partida reiniciada");

  // Determinar label do relógio
  const clockDisplay = event.clock?.displayValue?.trim() || "";
  let clockLabel = "";
  if (isShootout) {
    clockLabel = "⚽ Pên";
  } else if (isKickoff) {
    clockLabel = clockDisplay ? (clockDisplay.endsWith("'") ? clockDisplay : `${clockDisplay}'`) : "1'";
  } else if (clockDisplay) {
    clockLabel = clockDisplay.endsWith("'") ? clockDisplay : `${clockDisplay}'`;
  } else {
    clockLabel = "⏱️";
  }

  // Ícone visual
  let icon = "⏱️";
  if (isHalftime || isExtraTimeHalf) {
    icon = "☕";
  } else if (isEndRegularTime || isExtraTimeEnd) {
    icon = "🏁";
  } else if (isShootout || event.scoringPlay || typeStr.startsWith("goal")) {
    icon = "⚽";
  } else if (typeStr === "yellow-card" || typeId === "94" || typeText.includes("amarelo")) {
    icon = "🟨";
  } else if (typeStr === "red-card" || typeId === "93" || typeText.includes("vermelho")) {
    icon = "🟥";
  } else if (typeStr === "substitution" || typeId === "76" || typeText.includes("substituição")) {
    icon = "🔄";
  } else if (mainText.toLowerCase().includes("paralisad") || mainText.toLowerCase().includes("interrompid")) {
    icon = "⏸️";
  } else if (mainText.toLowerCase().includes("recomeça") || mainText.toLowerCase().includes("reiniciad")) {
    icon = "▶️";
  }

  return {
    isPeriodEvent,
    isShootout,
    clockLabel,
    mainText,
    icon,
  };
}

function TimelineTab({ keyEvents, matchState }: { keyEvents: any[], matchState?: string }) {
  if (matchState === "pre") {
    return <div className="text-center text-slate-500 py-8">A partida ainda não começou.</div>;
  }

  if (!keyEvents || keyEvents.length === 0) {
    return <div className="text-center text-slate-500 py-8">Nenhum evento registrado.</div>;
  }

  // Ordenar por minuto (crescente)
  const sortedEvents = [...keyEvents].sort((a, b) => (a.clock?.value ?? 0) - (b.clock?.value ?? 0));

  // Filtrar shadow events e duplicidades redundantes de paralisação e reinício no mesmo minuto
  const filteredEvents = sortedEvents.filter((e, idx, arr) => {
    const typeStr = e.type?.type || "";
    const typeId = String(e.type?.id || "");
    const isDelayType = typeStr === "start-delay" || typeStr === "end-delay" || typeId === "129" || typeId === "130";

    if (isDelayType) {
      // 1. Se este evento não tem texto editorial (text é vazio/undefined),
      // e já existe outro evento de parada/reinício com texto descritivo no mesmo minuto, descartar o shadow event.
      if (!e.text || !e.text.trim()) {
        const hasBetterSibling = arr.some((other, oIdx) => 
          oIdx !== idx && 
          other.clock?.displayValue === e.clock?.displayValue && 
          other.text && other.text.trim().length > 0
        );
        if (hasBetterSibling) return false;
      }

      // 2. Se este evento for de reinício (Fim do atraso / Partida reiniciada) e já houver outro evento dizendo "recomeça" no mesmo minuto
      const currentText = (e.text || e.type?.text || "").toLowerCase();
      if (currentText.includes("atraso") || currentText.includes("reiniciad") || typeId === "130" || typeStr === "end-delay") {
        const hasRecomeca = arr.some((other, oIdx) => 
          oIdx !== idx && 
          other.clock?.displayValue === e.clock?.displayValue && 
          (other.text || other.type?.text || "").toLowerCase().includes("recomeça")
        );
        if (hasRecomeca) return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-3">
      {filteredEvents.map((event, idx) => {
        const details = getTimelineEventDetails(event);

        if (details.isPeriodEvent) {
          return (
            <div 
              key={event.id || `period-${idx}`}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-300 font-semibold text-xs tracking-wide"
            >
              <span className="flex items-center gap-2">
                <span>{details.icon}</span>
                <span>{details.mainText}</span>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">{details.clockLabel}</span>
            </div>
          );
        }

        return (
          <div 
            key={event.id || idx} 
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg transition-colors",
              details.isShootout 
                ? "bg-slate-800/80 border border-amber-500/30 shadow-sm" 
                : "bg-slate-800/50"
            )}
          >
            <div className={cn(
              "w-14 text-right font-bold shrink-0 text-xs mt-0.5",
              details.isShootout ? "text-amber-400" : "text-slate-400 font-mono"
            )}>
              {details.clockLabel}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 leading-snug">{details.mainText}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsTab({ boxscore, homeId, awayId, matchState }: { boxscore: any, homeId: string, awayId: string, matchState?: string }) {
  if (matchState === "pre") {
    return <div className="text-center text-slate-500 py-8">A partida ainda não começou.</div>;
  }

  if (!boxscore || !boxscore.teams) {
    return <div className="text-center text-slate-500 py-8">Estatísticas indisponíveis.</div>;
  }

  const homeStats = boxscore.teams.find((t: any) => t.team.id === homeId)?.statistics || [];
  const awayStats = boxscore.teams.find((t: any) => t.team.id === awayId)?.statistics || [];

  // Dicionário de tradução caso a API retorne em inglês ou pt-br despadronizado
  const statTranslations: Record<string, string> = {
    // Básicos (Português que podem vir zoados)
    "faltas": "Faltas",
    "defesas": "Defesas",
    "chutes": "Finalizações",
    "Fin. certas": "Chutes no Gol",

    // Inglês -> Português (Mapeamento Completo)
    "Fouls": "Faltas",
    "Yellow Cards": "Cartões Amarelos",
    "Red Cards": "Cartões Vermelhos",
    "Offsides": "Impedimentos",
    "Corner Kicks": "Escanteios",
    "Saves": "Defesas",
    "Possession": "Posse de Bola (%)",
    "Shots": "Finalizações",
    "Shots On Goal": "Chutes no Gol",
    "Total Passes": "Total de Passes",
    "Passes Completed": "Passes Certos",
    "Tackles": "Desarmes",
    "Attacks": "Ataques",
    "Dangerous Attacks": "Ataques Perigosos",
    "On Target %": "Acerto no Alvo (%)",
    "Penalty Goals": "Gols de Pênalti",
    "Penalty Kicks Taken": "Pênaltis Cobrados",
    "Accurate Passes": "Passes Certos",
    "Passes": "Total de Passes",
    "Pass Completion %": "Precisão de Passes (%)",
    "Accurate Crosses": "Cruzamentos Certos",
    "Crosses": "Cruzamentos",
    "Cross %": "Precisão de Cruz. (%)",
    "Long Balls": "Lançamentos",
    "Accurate Long Balls": "Lançamentos Certos",
    "Long Balls %": "Precisão de Lanç. (%)",
    "Blocked Shots": "Chutes Bloqueados",
    "Effective Tackles": "Desarmes Bem-Sucedidos",
    "Tackle %": "Eficácia de Desarmes (%)",
    "Interceptions": "Interceptações",
    "Effective Clearances": "Cortes Efetivos",
    "Clearances": "Cortes / Afastamentos"
  };

  return (
    <div className="space-y-6">
      {homeStats.map((hStat: any, index: number) => {
        const aStat = awayStats[index];
        if (!aStat) return null;
        
        // Calcular porcentagens para as barras (simplificado)
        const hValue = parseFloat(hStat.displayValue) || 0;
        const aValue = parseFloat(aStat.displayValue) || 0;
        const total = hValue + aValue || 1;
        const hPct = (hValue / total) * 100;

        // Tenta achar pelo label ou name, se não achar capitaliza a primeira letra do original
        const rawLabel = hStat.label || hStat.name;
        const labelPt = statTranslations[rawLabel] || 
                        (rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1));

        return (
          <div key={hStat.name} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>{hStat.displayValue}</span>
              <span className="text-slate-500 uppercase text-center">{labelPt}</span>
              <span>{aStat.displayValue}</span>
            </div>
            <div className="flex h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${hPct}%` }} />
              <div className="bg-rose-500 transition-all duration-500" style={{ width: `${100 - hPct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RostersTab({ rosters, homeId, awayId, matchState }: { rosters: any[], homeId: string, awayId: string, matchState?: string }) {
  if (matchState === "pre") {
    return <div className="text-center text-slate-500 py-8">A partida ainda não começou.</div>;
  }

  if (!rosters || rosters.length === 0) {
    return <div className="text-center text-slate-500 py-8">Escalações indisponíveis.</div>;
  }

  const homeRoster = rosters.find((r: any) => r.team.id === homeId);
  const awayRoster = rosters.find((r: any) => r.team.id === awayId);

  const renderRoster = (roster: any) => {
    if (!roster || !roster.roster) return <div className="flex-1 text-slate-500 text-sm">N/D</div>;
    
    const starters = roster.roster.filter((p: any) => p.starter);
    const bench = roster.roster.filter((p: any) => !p.starter);

    const renderPlayer = (player: any) => {
      // Procurar stats do jogador
      const stats = player.stats || [];
      const getStat = (name: string) => stats.find((s: any) => s.name === name)?.value || 0;
      
      const goals = getStat("totalGoals");
      const yellowCards = getStat("yellowCards");
      const redCards = getStat("redCards");
      
      return (
        <div key={player.athlete.id} className="flex gap-3 text-sm items-center py-1 border-b border-slate-800/30 last:border-0">
          <span className="text-slate-500 w-5 font-mono font-bold text-right shrink-0">
            {player.jersey || '-'}
          </span>
          <span className="text-slate-200 truncate flex-1">
            {player.athlete.shortName}
          </span>
          {/* Eventos do Jogador */}
          <div className="flex gap-1 items-center shrink-0">
            {goals > 0 && <span className="text-xs" title="Gol">⚽</span>}
            {yellowCards > 0 && <span className="text-xs" title="Cartão Amarelo">🟨</span>}
            {redCards > 0 && <span className="text-xs" title="Cartão Vermelho">🟥</span>}
            {player.subbedIn && <span className="text-emerald-400 text-xs font-bold" title="Entrou">▲</span>}
            {player.subbedOut && <span className="text-rose-500 text-xs font-bold" title="Saiu">▼</span>}
          </div>
        </div>
      );
    };

    return (
      <div className="flex-1 space-y-4">
        <h4 className="font-bold text-slate-300 mb-2 truncate text-center bg-slate-800 py-1 rounded">
          {roster.team.displayName}
        </h4>
        
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Titulares</h5>
          {starters.map(renderPlayer)}
        </div>
        
        {bench.length > 0 && (
          <div className="space-y-1 mt-4">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reservas</h5>
            {bench.map(renderPlayer)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 md:gap-6 divide-x divide-slate-800">
      {renderRoster(homeRoster)}
      <div className="pl-4 md:pl-6 flex-1">
        {renderRoster(awayRoster)}
      </div>
    </div>
  );
}
