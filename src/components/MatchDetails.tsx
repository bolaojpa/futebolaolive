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

  // Monitoramento de Gols e VAR no modal em tempo real
  const [goalAlert, setGoalAlert] = useState<boolean>(false);
  const [goalSide, setGoalSide] = useState<"home" | "away" | null>(null);
  const [varAlert, setVarAlert] = useState<boolean>(false);

  const homeScore = data?.header?.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === "home")?.score;
  const awayScore = data?.header?.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === "away")?.score;
  const isLive = data?.header?.competitions?.[0]?.status?.type?.state === "in";

  useEffect(() => {
    if (isLive && homeScore !== undefined && awayScore !== undefined) {
      const currHome = parseInt(homeScore, 10) || 0;
      const currAway = parseInt(awayScore, 10) || 0;

      if (prevScoresRef.current !== null) {
        const [prevH, prevA] = prevScoresRef.current.split("-").map(Number);
        if (currHome > prevH) {
          setVarAlert(false);
          setGoalAlert(true);
          setGoalSide("home");
          queryClient.invalidateQueries({ queryKey: ["scoreboard"] });
          const t = setTimeout(() => {
            setGoalAlert(false);
            setGoalSide(null);
          }, 12000);
          return () => clearTimeout(t);
        } else if (currAway > prevA) {
          setVarAlert(false);
          setGoalAlert(true);
          setGoalSide("away");
          queryClient.invalidateQueries({ queryKey: ["scoreboard"] });
          const t = setTimeout(() => {
            setGoalAlert(false);
            setGoalSide(null);
          }, 12000);
          return () => clearTimeout(t);
        } else if (currHome < prevH || currAway < prevA) {
          // Placar diminuiu = Gol anulado pelo VAR
          setGoalAlert(false);
          setGoalSide(null);
          setVarAlert(true);
          queryClient.invalidateQueries({ queryKey: ["scoreboard"] });
          const t = setTimeout(() => {
            setVarAlert(false);
          }, 12000);
          return () => clearTimeout(t);
        }
      }
      prevScoresRef.current = `${currHome}-${currAway}`;
    }
  }, [homeScore, awayScore, isLive, queryClient]);

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
            className="fixed bottom-0 left-0 right-0 md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] md:rounded-2xl md:h-[80vh] h-[85vh] bg-white dark:bg-slate-900 border-t md:border border-slate-200 dark:border-slate-800 z-50 flex flex-col shadow-2xl text-slate-900 dark:text-slate-100 transition-colors"
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Detalhes da Partida</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
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
                <MatchSummaryContent 
                  data={data as any} 
                  goalAlert={goalAlert}
                  goalSide={goalSide}
                  varAlert={varAlert}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MatchSummaryContent({ 
  data, 
  goalAlert, 
  goalSide, 
  varAlert 
}: { 
  data: any; 
  goalAlert?: boolean; 
  goalSide?: "home" | "away" | null; 
  varAlert?: boolean; 
}) {
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
      <div className={cn(
        "bg-slate-50 dark:bg-slate-950 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 relative",
        goalAlert && "ring-2 ring-emerald-500 dark:ring-emerald-400 border-emerald-500 dark:border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.25)]",
        varAlert && "ring-2 ring-rose-500 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.25)]"
      )}>
        {/* Alerta animado de GOL! ou VAR no Modal */}
        {goalAlert && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-4 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-2xl animate-bounce whitespace-nowrap">
            <span className="text-sm">⚽</span> GOL!
          </div>
        )}
        {varAlert && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-4 py-0.5 rounded-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-2xl animate-bounce whitespace-nowrap">
            <span>🖥️</span> GOL ANULADO (VAR)
          </div>
        )}
        <div className="flex justify-between items-center">
          <TeamDisplay team={home?.team} score={home?.score} isPreMatch={matchState === "pre"} align="left" isGoal={goalSide === "home"} />
          <div className="flex flex-col items-center px-4 gap-1.5">
            {isHalftime ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 px-3 py-1 rounded-full border border-amber-500/20 dark:border-amber-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                Intervalo
              </span>
            ) : showShootoutScores ? (
              <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 dark:border-amber-400/20">
                <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 min-w-3 text-right">
                  {homeShootout}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 dark:bg-amber-400/20 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none">
                  PK
                </span>
                <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 min-w-3 text-left">
                  {awayShootout}
                </span>
              </div>
            ) : null}
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">{statusDisplay}</span>
          </div>
          <TeamDisplay team={away?.team} score={away?.score} isPreMatch={matchState === "pre"} align="right" isGoal={goalSide === "away"} />
        </div>

        {/* Resumo compacto de Gols e Cartões */}
        <TeamEventsSummary homeEvents={homeEvents} awayEvents={awayEvents} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-0">
        {[
          { id: "resumo", label: "Resumo" },
          { id: "estatisticas", label: "Estatísticas" },
          { id: "escalacoes", label: "Escalações" },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "font-semibold text-sm pb-2 border-b-2 transition-colors",
              activeTab === tab.id 
                ? "text-emerald-600 dark:text-emerald-400 border-emerald-500 dark:border-emerald-400" 
                : "text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="py-2">
        {activeTab === "resumo" && <TimelineTab keyEvents={data.keyEvents} commentary={data.commentary} matchState={matchState} />}
        {activeTab === "estatisticas" && <StatsTab boxscore={data.boxscore} homeId={home?.id} awayId={away?.id} matchState={matchState} />}
        {activeTab === "escalacoes" && <RostersTab rosters={data.rosters} homeId={home?.id} awayId={away?.id} matchState={matchState} />}
      </div>
    </div>
  );
}

interface TeamIncident {
  id: string;
  type: "goal" | "yellow-card" | "red-card" | "missed-penalty";
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
      e.type?.id === "137" || 
      e.type?.id === "98" || 
      e.type?.id === "173";

    const isMissedPenalty = 
      e.type?.type === "penalty---missed" || 
      e.type?.id === "174" || 
      e.text?.toLowerCase().includes("pênalti perdido") || 
      e.text?.toLowerCase().includes("perdeu o pênalti");

    const isYellow = 
      e.type?.type === "yellow-card" || 
      e.type?.id === "94" || 
      e.type?.text?.toLowerCase().includes("amarelo");

    const isRed = 
      e.type?.type === "red-card" || 
      e.type?.id === "93" || 
      e.type?.type === "second-yellow-card" || 
      e.type?.text?.toLowerCase().includes("vermelho");

    if (!isGoal && !isYellow && !isRed && !isMissedPenalty) continue;

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
    } else if (isMissedPenalty) {
      incidents.push({
        id: e.id || `missed-pen-${clockValue}-${playerName}`,
        type: "missed-penalty",
        player: playerName,
        minute: `${minute} (Pên. Perdido)`.trim(),
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
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
      {/* Mandante (Alinhado à esquerda, em ordem cronológica) */}
      <div className="space-y-1 max-h-24 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        {homeEvents.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            {item.type === "goal" && <span className="text-xs shrink-0">⚽</span>}
            {item.type === "missed-penalty" && <span className="text-xs shrink-0" title="Pênalti Perdido">🚫⚽</span>}
            {item.type === "red-card" && <span className="w-2 h-2.5 bg-rose-500 rounded-[1.5px] inline-block shadow-sm shrink-0" />}
            {item.type === "yellow-card" && <span className="w-2 h-2.5 bg-amber-400 rounded-[1.5px] inline-block shadow-sm shrink-0" />}
            <span 
              className={cn(
                "truncate max-w-[125px] sm:max-w-[180px]",
                item.type === "goal" 
                  ? "font-semibold text-slate-900 dark:text-white" 
                  : item.type === "missed-penalty"
                  ? "font-medium text-amber-600 dark:text-amber-300"
                  : item.type === "red-card" 
                  ? "font-semibold text-rose-600 dark:text-rose-200" 
                  : "font-medium text-slate-700 dark:text-slate-300"
              )} 
              title={item.player}
            >
              {item.player}
            </span>
            <span 
              className={cn(
                "text-[10px] font-mono shrink-0",
                item.type === "red-card" ? "text-rose-500/80 dark:text-rose-400/80" : "text-slate-400"
              )}
            >
              {item.minute}
            </span>
          </div>
        ))}
      </div>

      {/* Visitante (Alinhado à direita, em ordem cronológica) */}
      <div className="space-y-1 max-h-24 overflow-y-auto pl-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        {awayEvents.map((item) => (
          <div key={item.id} className="flex items-center justify-end gap-1.5 text-slate-700 dark:text-slate-200">
            <span 
              className={cn(
                "text-[10px] font-mono shrink-0",
                item.type === "red-card" ? "text-rose-500/80 dark:text-rose-400/80" : "text-slate-400"
              )}
            >
              {item.minute}
            </span>
            <span 
              className={cn(
                "truncate max-w-[125px] sm:max-w-[180px]",
                item.type === "goal" 
                  ? "font-semibold text-slate-900 dark:text-white" 
                  : item.type === "missed-penalty"
                  ? "font-medium text-amber-600 dark:text-amber-300"
                  : item.type === "red-card" 
                  ? "font-semibold text-rose-600 dark:text-rose-200" 
                  : "font-medium text-slate-700 dark:text-slate-300"
              )} 
              title={item.player}
            >
              {item.player}
            </span>
            {item.type === "goal" && <span className="text-xs shrink-0">⚽</span>}
            {item.type === "missed-penalty" && <span className="text-xs shrink-0" title="Pênalti Perdido">🚫⚽</span>}
            {item.type === "red-card" && <span className="w-2 h-2.5 bg-rose-500 rounded-[1.5px] inline-block shadow-sm shrink-0" />}
            {item.type === "yellow-card" && <span className="w-2 h-2.5 bg-amber-400 rounded-[1.5px] inline-block shadow-sm shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamDisplay({ 
  team, 
  score, 
  isPreMatch, 
  align, 
  isGoal 
}: { 
  team: any; 
  score: string; 
  isPreMatch?: boolean; 
  align: "left" | "right"; 
  isGoal?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-3 flex-1`}>
      <div className="w-16 h-16 relative flex items-center justify-center">
        {team?.logos?.[0]?.href ? (
           <img src={team?.logos?.[0]?.href} alt={team?.name} className="w-16 h-16 object-contain" />
        ) : (
           <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800" />
        )}
      </div>
      <div className="text-center">
        <span className={cn(
          "block text-sm font-bold transition-colors line-clamp-1",
          isGoal ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-slate-800 dark:text-slate-100"
        )}>
          {team?.shortDisplayName || team?.name}
        </span>
      </div>
      <span className={cn(
        "text-4xl font-black transition-all duration-300",
        isGoal 
          ? "text-emerald-600 dark:text-emerald-400 scale-125 drop-shadow-[0_0_15px_rgba(16,185,129,0.9)]" 
          : "text-slate-900 dark:text-white"
      )}>
        {isPreMatch ? "-" : (score || "0")}
      </span>
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

  const isGoal = isShootout || event.scoringPlay || typeStr.startsWith("goal") || typeId === "70" || typeId === "137";
  const isMissedPenalty = typeStr.includes("penalty---missed") || typeId === "174" || mainText.toLowerCase().includes("pênalti perdido") || mainText.toLowerCase().includes("perdeu o pênalti");
  const isVar = typeStr.includes("var") || typeText.includes("var") || typeText.includes("anulado") || mainText.toLowerCase().includes("decisão do var") || mainText.toLowerCase().includes("revisão do var") || mainText.toLowerCase().includes("gol anulado");
  const isWoodwork = mainText.toLowerCase().includes("trave") || mainText.toLowerCase().includes("travessão");

  // Ícone visual
  let icon = "⏱️";
  if (isHalftime || isExtraTimeHalf) {
    icon = "☕";
  } else if (isEndRegularTime || isExtraTimeEnd) {
    icon = "🏁";
  } else if (isVar) {
    icon = "🖥️";
  } else if (isMissedPenalty) {
    icon = "🚫⚽";
  } else if (isGoal) {
    icon = "⚽";
  } else if (isWoodwork) {
    icon = "🥅";
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
    isGoal,
    isVar,
    clockLabel,
    mainText,
    icon,
  };
}

function getCommentaryIcon(text: string): string {
  const t = (text || "").toLowerCase();
  if (t.includes("gol!") || t.startsWith("gol") || t.includes("marca o gol")) return "⚽";
  if (t.includes("cartão vermelho") || t.includes("segundo cartão amarelo")) return "🟥";
  if (t.includes("cartão amarelo")) return "🟨";
  if (t.includes("substituição")) return "🔄";
  if (t.includes("var") || t.includes("anulado")) return "🖥️";
  if (t.includes("pênalti perdido") || t.includes("perdeu o pênalti")) return "🚫⚽";
  if (t.includes("pênalti") || t.includes("penalidade")) return "🎯";
  if (t.includes("trave") || t.includes("travessão")) return "🥅";
  if (t.includes("defesa") || t.includes("defendida")) return "🧤";
  if (t.includes("escanteio")) return "🚩";
  if (t.includes("impedimento")) return "🚩";
  if (t.includes("falta")) return "⚠️";
  if (t.includes("início") || t.includes("começo")) return "⏱️";
  if (t.includes("intervalo")) return "☕";
  if (t.includes("fim")) return "🏁";
  return "⏱️";
}

function TimelineTab({ 
  keyEvents, 
  commentary, 
  matchState 
}: { 
  keyEvents: any[]; 
  commentary?: any[]; 
  matchState?: string; 
}) {
  const [timelineMode, setTimelineMode] = useState<"key" | "all">("key");

  if (matchState === "pre") {
    return <div className="text-center text-slate-500 py-8">A partida ainda não começou.</div>;
  }

  const hasKeyEvents = keyEvents && keyEvents.length > 0;
  const hasCommentary = commentary && commentary.length > 0;

  if (!hasKeyEvents && !hasCommentary) {
    return <div className="text-center text-slate-500 py-8">Nenhum evento registrado até o momento.</div>;
  }

  const activeMode = (!hasKeyEvents && hasCommentary) ? "all" : timelineMode;

  // Ordenar keyEvents por minuto (crescente)
  const sortedEvents = [...(keyEvents || [])].sort((a, b) => (a.clock?.value ?? 0) - (b.clock?.value ?? 0));

  // Filtrar shadow events e duplicidades redundantes de paralisação e reinício no mesmo minuto
  const filteredEvents = sortedEvents.filter((e, idx, arr) => {
    const typeStr = e.type?.type || "";
    const typeId = String(e.type?.id || "");
    const isDelayType = typeStr === "start-delay" || typeStr === "end-delay" || typeId === "129" || typeId === "130";

    if (isDelayType) {
      if (!e.text || !e.text.trim()) {
        const hasBetterSibling = arr.some((other, oIdx) => 
          oIdx !== idx && 
          other.clock?.displayValue === e.clock?.displayValue && 
          other.text && other.text.trim().length > 0
        );
        if (hasBetterSibling) return false;
      }

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
    <div className="space-y-4">
      {/* Sub-toggle: Principais Lances vs Lance a Lance */}
      {hasCommentary && hasKeyEvents && (
        <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800/60">
          <button
            onClick={() => setTimelineMode("key")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
              activeMode === "key"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <span>⚡</span> Principais Lances
          </button>
          <button
            onClick={() => setTimelineMode("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
              activeMode === "all"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <span>📝</span> Lance a Lance ({commentary.length})
          </button>
        </div>
      )}

      {/* Visão de Principais Lances */}
      {activeMode === "key" && (
        <div className="space-y-3">
          {filteredEvents.map((event, idx) => {
            const details = getTimelineEventDetails(event);

            if (details.isPeriodEvent) {
              return (
                <div 
                  key={event.id || `period-${idx}`}
                  className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 font-semibold text-xs tracking-wide"
                >
                  <span className="flex items-center gap-2">
                    <span>{details.icon}</span>
                    <span>{details.mainText}</span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{details.clockLabel}</span>
                </div>
              );
            }

            return (
              <div 
                key={event.id || idx} 
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors",
                  details.isShootout 
                    ? "bg-amber-50 dark:bg-slate-800/80 border border-amber-400/40 dark:border-amber-500/30 shadow-sm" 
                    : details.isGoal
                    ? "bg-emerald-50 dark:bg-slate-800/80 border border-emerald-400/40 dark:border-emerald-500/30 shadow-sm"
                    : details.isVar
                    ? "bg-amber-50/70 dark:bg-amber-950/20 border border-amber-400/40 dark:border-amber-500/30 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-transparent"
                )}
              >
                <div className={cn(
                  "w-14 text-right font-bold shrink-0 text-xs mt-0.5",
                  details.isShootout ? "text-amber-600 dark:text-amber-400" : details.isGoal ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-slate-500 dark:text-slate-400 font-mono"
                )}>
                  {details.clockLabel}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0">{details.icon}</span>
                    <p className={cn(
                      "text-sm font-medium leading-snug",
                      details.isGoal ? "text-slate-900 dark:text-white font-semibold" : "text-slate-800 dark:text-slate-200"
                    )}>
                      {details.mainText}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visão de Lance a Lance Completo */}
      {activeMode === "all" && hasCommentary && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          {commentary.map((c: any, idx: number) => {
            const icon = getCommentaryIcon(c.text);
            const isGoal = icon === "⚽";
            const isVar = icon === "🖥️";
            const isCard = icon === "🟨" || icon === "🟥";

            return (
              <div 
                key={c.sequence ?? idx} 
                className={cn(
                  "flex items-start gap-3 p-2.5 rounded-lg border transition-colors",
                  isGoal 
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40" 
                    : isVar
                    ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40"
                    : isCard
                    ? "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/60"
                    : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800/60"
                )}
              >
                <div className={cn(
                  "w-12 text-right font-mono text-xs font-bold shrink-0 mt-0.5",
                  isGoal ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-slate-500 dark:text-slate-400"
                )}>
                  {c.time?.displayValue || "--"}
                </div>
                <div className="flex-1 min-w-0 flex items-start gap-2">
                  <span className="shrink-0 text-sm">{icon}</span>
                  <p className={cn(
                    "text-xs leading-relaxed",
                    isGoal ? "text-slate-900 dark:text-white font-semibold" : "text-slate-800 dark:text-slate-200"
                  )}>
                    {c.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{hStat.displayValue}</span>
              <span className="text-slate-500 uppercase text-center">{labelPt}</span>
              <span>{aStat.displayValue}</span>
            </div>
            <div className="flex h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
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
        <div key={player.athlete.id} className="flex gap-3 text-sm items-center py-1 border-b border-slate-200 dark:border-slate-800/30 last:border-0">
          <span className="text-slate-400 dark:text-slate-500 w-5 font-mono font-bold text-right shrink-0">
            {player.jersey || '-'}
          </span>
          <span className="text-slate-800 dark:text-slate-200 truncate flex-1">
            {player.athlete.shortName}
          </span>
          {/* Eventos do Jogador */}
          <div className="flex gap-1 items-center shrink-0">
            {goals > 0 && <span className="text-xs" title="Gol">⚽</span>}
            {yellowCards > 0 && <span className="text-xs" title="Cartão Amarelo">🟨</span>}
            {redCards > 0 && <span className="text-xs" title="Cartão Vermelho">🟥</span>}
            {player.subbedIn && <span className="text-emerald-500 text-xs font-bold" title="Entrou">▲</span>}
            {player.subbedOut && <span className="text-rose-500 text-xs font-bold" title="Saiu">▼</span>}
          </div>
        </div>
      );
    };

    return (
      <div className="flex-1 space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-slate-300 mb-2 truncate text-center bg-slate-100 dark:bg-slate-800 py-1 rounded">
          {roster.team.displayName}
        </h4>
        
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Titulares</h5>
          {starters.map(renderPlayer)}
        </div>
        
        {bench.length > 0 && (
          <div className="space-y-1 mt-4">
            <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Reservas</h5>
            {bench.map(renderPlayer)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 md:gap-6 divide-x divide-slate-200 dark:divide-slate-800">
      {renderRoster(homeRoster)}
      <div className="pl-4 md:pl-6 flex-1">
        {renderRoster(awayRoster)}
      </div>
    </div>
  );
}
