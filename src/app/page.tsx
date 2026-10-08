"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchScoreboard } from "@/services/espnApi";
import { Header } from "@/components/Header";
import { LEAGUES, LeagueSelector } from "@/components/LeagueSelector";
import { MatchCard } from "@/components/MatchCard";
import { MatchDetailsModal } from "@/components/MatchDetails";
import { RefreshCw, ChevronDown } from "lucide-react";
import { Standings } from "@/components/Standings";
import { KnockoutStage } from "@/components/KnockoutStage";

export default function Home() {
  const [activeLeague, setActiveLeague] = useState<string>(LEAGUES[0].slug);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string, slug: string } | null>(null);
  const [leagueFilterMode, setLeagueFilterMode] = useState<"upcoming" | "finished" | "standings" | "knockout">("upcoming");

  const { data, isLoading, error } = useQuery({
    queryKey: ["scoreboard", activeLeague],
    queryFn: () => fetchScoreboard(activeLeague),
    // Polling only se houver necessidade
    refetchInterval: 30000, 
  });

  const events = data?.events || [];
  
  // Função para pegar o nome correto da liga pro card
  const getLeagueName = (event: any) => {
    const slug = event._customLeagueSlug || activeLeague;
    const league = LEAGUES.find(l => l.slug === slug);
    return league?.name || "Competição";
  };

  const getLeagueSlug = (event: any) => {
    return event._customLeagueSlug || activeLeague;
  };

  const getLeagueLogo = (event: any) => {
    return event._customLeagueLogo || data?.leagues?.[0]?.logos?.[0]?.href;
  };

  const liveEvents = events.filter((e) => e.status.type.state === "in");
  
  // Próximos Jogos (ordem de data crescente, máx 10 na home, 50 na liga)
  const isHome = activeLeague === "all";
  const limit = isHome ? 10 : 50;

  const upcomingEvents = events
    .filter((e) => e.status.type.state === "pre")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
    
  // Últimos Jogos (ordem de data decrescente)
  const finishedEvents = events
    .filter((e) => e.status.type.state === "post")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  return (
    <main className="flex-1 flex flex-col bg-[#020617] min-h-screen">
      <Header />
      
      <div className="sticky top-16 z-40 bg-slate-950/95 backdrop-blur-md">
        <LeagueSelector activeLeague={activeLeague} onSelect={(slug) => {
          setActiveLeague(slug);
          setLeagueFilterMode("upcoming"); // reseta o filtro ao mudar de liga
        }} />
      </div>

      <div className="container mx-auto px-4 py-8 space-y-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p>Carregando partidas...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-rose-500">
            <p>Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="text-6xl mb-4">⚽</div>
            <p className="text-lg">Nenhuma partida encontrada para esta competição no momento.</p>
          </div>
        ) : (
          <>
            {/* JOGOS AO VIVO SEMPRE NO TOPO */}
            {liveEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Ao Vivo</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveEvents.map((event) => (
                    <MatchCard 
                      key={event.id} 
                      event={event} 
                      leagueName={getLeagueName(event)} 
                      leagueLogo={getLeagueLogo(event)}
                      onClick={(id) => setSelectedEvent({ id, slug: getLeagueSlug(event) })} 
                    />
                  ))}
                </div>
              </section>
            )}

            {isHome ? (
              // MODO HOME: SEÇÕES MISTURADAS
              <>
                {upcomingEvents.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wider">Próximos Jogos</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {upcomingEvents.map((event) => (
                        <MatchCard 
                          key={event.id} 
                          event={event} 
                          leagueName={getLeagueName(event)} 
                          leagueLogo={getLeagueLogo(event)}
                          onClick={(id) => setSelectedEvent({ id, slug: getLeagueSlug(event) })} 
                        />
                      ))}
                    </div>
                  </section>
                )}

                {finishedEvents.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-3 h-3 rounded-full bg-slate-600" />
                      <h3 className="text-lg font-bold text-slate-400 uppercase tracking-wider">Últimos Jogos</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {finishedEvents.map((event) => (
                        <MatchCard 
                          key={event.id} 
                          event={event} 
                          leagueName={getLeagueName(event)} 
                          leagueLogo={getLeagueLogo(event)}
                          onClick={(id) => setSelectedEvent({ id, slug: getLeagueSlug(event) })} 
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              // MODO ABA ESPECÍFICA: FILTRO TOGGLE
              <section>
                {/* Mobile Filter Dropdown */}
                <div className="md:hidden mb-6 relative">
                  <select
                    value={leagueFilterMode}
                    onChange={(e) => setLeagueFilterMode(e.target.value as any)}
                    className="w-full appearance-none bg-slate-900 border border-slate-800 text-slate-200 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="upcoming">Próximos Jogos</option>
                    <option value="finished">Finalizados</option>
                    <option value="standings">Classificação</option>
                    <option value="knockout">Mata-Mata</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>

                {/* Desktop Filter Tabs */}
                <div className="hidden md:flex flex-wrap items-center gap-y-4 gap-x-6 mb-6 border-b border-slate-800 pb-2">
                  <button 
                    onClick={() => setLeagueFilterMode("upcoming")}
                    className={`flex items-center gap-2 pb-2 -mb-[9px] border-b-2 transition-colors ${leagueFilterMode === "upcoming" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${leagueFilterMode === "upcoming" ? "bg-emerald-500" : "bg-slate-600"}`} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Próximos Jogos</h3>
                  </button>
                  <button 
                    onClick={() => setLeagueFilterMode("finished")}
                    className={`flex items-center gap-2 pb-2 -mb-[9px] border-b-2 transition-colors ${leagueFilterMode === "finished" ? "border-slate-300 text-slate-200" : "border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${leagueFilterMode === "finished" ? "bg-slate-300" : "bg-slate-600"}`} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Finalizados</h3>
                  </button>
                  <button 
                    onClick={() => setLeagueFilterMode("standings")}
                    className={`flex items-center gap-2 pb-2 -mb-[9px] border-b-2 transition-colors ${leagueFilterMode === "standings" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${leagueFilterMode === "standings" ? "bg-amber-500" : "bg-slate-600"}`} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Classificação</h3>
                  </button>
                  <button 
                    onClick={() => setLeagueFilterMode("knockout")}
                    className={`flex items-center gap-2 pb-2 -mb-[9px] border-b-2 transition-colors ${leagueFilterMode === "knockout" ? "border-purple-500 text-purple-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${leagueFilterMode === "knockout" ? "bg-purple-500" : "bg-slate-600"}`} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Mata-Mata</h3>
                  </button>
                </div>
                
                {leagueFilterMode === "standings" ? (
                  <Standings leagueSlug={activeLeague} />
                ) : leagueFilterMode === "knockout" ? (
                  <KnockoutStage leagueSlug={activeLeague} onMatchClick={(id, slug) => setSelectedEvent({ id, slug })} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leagueFilterMode === "upcoming" ? (
                    upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => (
                        <MatchCard 
                          key={event.id} 
                          event={event} 
                          leagueName={getLeagueName(event)} 
                          leagueLogo={getLeagueLogo(event)}
                          onClick={(id) => setSelectedEvent({ id, slug: getLeagueSlug(event) })} 
                        />
                      ))
                    ) : (
                      <p className="text-slate-500 col-span-full py-8 text-center">Nenhum jogo agendado encontrado.</p>
                    )
                  ) : (
                    finishedEvents.length > 0 ? (
                      finishedEvents.map((event) => (
                        <MatchCard 
                          key={event.id} 
                          event={event} 
                          leagueName={getLeagueName(event)} 
                          leagueLogo={getLeagueLogo(event)}
                          onClick={(id) => setSelectedEvent({ id, slug: getLeagueSlug(event) })} 
                        />
                      ))
                    ) : (
                      <p className="text-slate-500 col-span-full py-8 text-center">Nenhum jogo finalizado encontrado.</p>
                    )
                  )}
                </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <MatchDetailsModal 
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        eventId={selectedEvent?.id || null}
        leagueSlug={selectedEvent?.slug || activeLeague}
      />
    </main>
  );
}
