"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMatchSummary } from "@/services/espnApi";
import { X, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MatchDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  leagueSlug: string;
}

export function MatchDetailsModal({ isOpen, onClose, eventId, leagueSlug }: MatchDetailsProps) {
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
    refetchInterval: 30000, 
  });

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
  
  // Se for "pre", formata a data para horário de Brasília (24h)
  let statusDisplay = header.status.type.detail;
  if (matchState === "pre" && header.date) {
    statusDisplay = new Date(header.date).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(", ", " às ");
  }

  return (
    <div className="space-y-6">
      {/* Placar Gigante */}
      <div className="flex justify-between items-center bg-slate-950 p-6 rounded-xl border border-slate-800">
        <TeamDisplay team={home?.team} score={home?.score} isPreMatch={matchState === "pre"} align="left" />
        <div className="flex flex-col items-center px-4">
          <span className="text-sm font-medium text-slate-400 text-center">{statusDisplay}</span>
        </div>
        <TeamDisplay team={away?.team} score={away?.score} isPreMatch={matchState === "pre"} align="right" />
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

function TimelineTab({ keyEvents, matchState }: { keyEvents: any[], matchState?: string }) {
  if (matchState === "pre") {
    return <div className="text-center text-slate-500 py-8">A partida ainda não começou.</div>;
  }

  if (!keyEvents || keyEvents.length === 0) {
    return <div className="text-center text-slate-500 py-8">Nenhum evento registrado.</div>;
  }

  // Ordenar por minuto (crescente)
  const sortedEvents = [...keyEvents].sort((a, b) => a.clock?.value - b.clock?.value);

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, idx) => (
        <div key={event.id || idx} className="flex items-start gap-4 p-3 bg-slate-800/50 rounded-lg">
          <div className="w-12 text-right font-bold text-slate-400 shrink-0">
            {event.clock?.displayValue}'
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{event.text}</p>
            {event.shortText && <p className="text-xs text-slate-500 mt-1">{event.shortText}</p>}
          </div>
        </div>
      ))}
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
