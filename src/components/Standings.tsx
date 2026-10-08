import { useQuery } from "@tanstack/react-query";
import { fetchStandings } from "@/services/espnApi";
import { Loader2 } from "lucide-react";

export function Standings({ leagueSlug }: { leagueSlug: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["standings", leagueSlug],
    queryFn: () => fetchStandings(leagueSlug),
    enabled: !!leagueSlug && leagueSlug !== "all",
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !data || !data.children || data.children.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Classificação não disponível no momento.
      </div>
    );
  }

  // Alguns campeonatos (como Champions) têm múltiplos grupos, então iteramos sobre "children"
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {data.children.map((group: any) => (
        <div key={group.uid} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {group.name && group.name !== "Campeonato Brasileiro" && (
            <div className="bg-slate-800 px-4 py-2 font-bold text-sm text-slate-300">
              {group.name}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-slate-900/50 uppercase">
                <tr>
                  <th className="px-4 py-3 w-8">#</th>
                  <th className="px-4 py-3 min-w-[150px]">Clube</th>
                  <th className="px-2 py-3 text-center" title="Pontos">P</th>
                  <th className="px-2 py-3 text-center" title="Jogos">J</th>
                  <th className="px-2 py-3 text-center" title="Vitórias">V</th>
                  <th className="px-2 py-3 text-center" title="Empates">E</th>
                  <th className="px-2 py-3 text-center" title="Derrotas">D</th>
                  <th className="px-2 py-3 text-center" title="Saldo de Gols">SG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {group.standings?.entries?.map((entry: any) => {
                  const stats = entry.stats;
                  const getStat = (name: string) => stats.find((s: any) => s.name === name)?.displayValue || "0";
                  
                  return (
                    <tr key={entry.team.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-400">
                        {getStat("rank")}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-3">
                        <img 
                          src={entry.team.logos?.[0]?.href} 
                          alt={entry.team.name} 
                          className="w-6 h-6 object-contain"
                        />
                        <span className="font-semibold text-slate-200">
                          {entry.team.shortDisplayName}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center font-bold text-emerald-500">
                        {getStat("points")}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-300">{getStat("gamesPlayed")}</td>
                      <td className="px-2 py-3 text-center text-slate-300">{getStat("wins")}</td>
                      <td className="px-2 py-3 text-center text-slate-300">{getStat("ties")}</td>
                      <td className="px-2 py-3 text-center text-slate-300">{getStat("losses")}</td>
                      <td className="px-2 py-3 text-center text-slate-300 font-medium">
                        {getStat("pointDifferential")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
