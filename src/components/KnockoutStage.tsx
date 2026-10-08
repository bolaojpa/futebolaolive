import { useQuery } from "@tanstack/react-query";
import { fetchScoreboard } from "@/services/espnApi";
import { MatchCard } from "./MatchCard";
import { Loader2 } from "lucide-react";
import { ESPNEvent } from "@/types/espn";

const KNOCKOUT_STAGES = [
  { slug: "final", label: "Final" },
  { slug: "semifinals", label: "Semifinais" },
  { slug: "quarterfinals", label: "Quartas de Final" },
  { slug: "round-of-16", label: "Oitavas de Final" }
];

export function KnockoutStage({ leagueSlug, onMatchClick }: { leagueSlug: string, onMatchClick: (id: string, slug: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["scoreboard-full-year", leagueSlug],
    queryFn: () => {
      // Force fetching the full year to get all knockout games
      return fetchScoreboard(leagueSlug, new Date().getFullYear().toString());
    },
    enabled: !!leagueSlug && leagueSlug !== "all",
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const allEvents = data?.events || [];
  
  // Agrupar os jogos por fase
  const groupedEvents = KNOCKOUT_STAGES.map(stage => {
    return {
      ...stage,
      events: allEvents.filter((e: any) => e.season?.slug === stage.slug)
    };
  }).filter(stage => stage.events.length > 0);

  if (groupedEvents.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Nenhum jogo de mata-mata disponível para esta competição no momento.
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {groupedEvents.map((stage) => (
        <section key={stage.slug} className="relative">
          {/* Header da Fase */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            <h3 className="text-xl font-black text-white uppercase tracking-widest px-4 py-1 bg-slate-900 border border-emerald-500/30 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              {stage.label}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {stage.events.map((event: ESPNEvent) => (
              <div key={event.id} className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(25%-1rem)] max-w-[450px]">
                <MatchCard 
                  event={event}
                  onClick={(id) => onMatchClick(id, leagueSlug)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
