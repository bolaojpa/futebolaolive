import { useQuery } from "@tanstack/react-query";
import { fetchStandings } from "@/services/espnApi";
import { Loader2 } from "lucide-react";
import { extractEspnLogos } from "@/lib/espnLogos";
import { ThemeAdaptiveLogo } from "@/components/ThemeAdaptiveLogo";

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

  // Normaliza nomes de grupos que a API da ESPN ocasionalmente devolve em inglês ("Group G" -> "Grupo G")
  const normalizeGroupName = (name?: string) => {
    if (!name) return "";
    return name.replace(/^Group\b/i, "Grupo");
  };

  // Ordena múltiplos grupos alfabeticamente já traduzidos (Grupo A, Grupo B, ..., Grupo G, Grupo H)
  const sortedGroups = [...data.children].sort((a: any, b: any) =>
    normalizeGroupName(a.name).localeCompare(normalizeGroupName(b.name), "pt-BR", { numeric: true })
  );

  // Alguns campeonatos (como Libertadores e Champions) têm múltiplos grupos, então iteramos sobre "children"
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {sortedGroups.map((group: any) => {
        const getNumericStat = (entry: any, name: string, fallback: number) => {
          const stat = entry.stats?.find((s: any) => s.name === name);
          if (stat?.value !== undefined && !isNaN(Number(stat.value))) return Number(stat.value);
          const parsed = parseInt(stat?.displayValue, 10);
          return isNaN(parsed) ? fallback : parsed;
        };

        // Garante ordenação estrita pela posição (rank 1, 2, 3, 4...) em qualquer liga ou fase de grupos
        const sortedEntries = [...(group.standings?.entries || [])].sort((a: any, b: any) => {
          const rankA = getNumericStat(a, "rank", 999);
          const rankB = getNumericStat(b, "rank", 999);
          if (rankA !== rankB) return rankA - rankB;

          const ptsA = getNumericStat(a, "points", 0);
          const ptsB = getNumericStat(b, "points", 0);
          if (ptsA !== ptsB) return ptsB - ptsA;

          const gdA = getNumericStat(a, "pointDifferential", 0);
          const gdB = getNumericStat(b, "pointDifferential", 0);
          if (gdA !== gdB) return gdB - gdA;

          return getNumericStat(b, "wins", 0) - getNumericStat(a, "wins", 0);
        });

        const displayGroupName = normalizeGroupName(group.name);

        return (
        <div key={group.uid} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs dark:shadow-none transition-colors">
          {displayGroupName && displayGroupName !== "Campeonato Brasileiro" && (
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              {displayGroupName}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] table-fixed text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 uppercase border-b border-slate-200 dark:border-slate-800/80">
                <tr>
                  <th className="px-3 sm:px-4 py-3 w-10 sm:w-12 text-center">#</th>
                  <th className="px-2 sm:px-4 py-3">Clube</th>
                  <th className="px-1 sm:px-2 py-3 w-10 sm:w-14 md:w-16 text-center" title="Pontos">P</th>
                  <th className="px-1 sm:px-2 py-3 w-10 sm:w-14 md:w-16 text-center" title="Jogos">J</th>
                  <th className="px-1 sm:px-2 py-3 w-10 sm:w-14 md:w-16 text-center" title="Vitórias">V</th>
                  <th className="px-1 sm:px-2 py-3 w-10 sm:w-14 md:w-16 text-center" title="Empates">E</th>
                  <th className="px-1 sm:px-2 py-3 w-10 sm:w-14 md:w-16 text-center" title="Derrotas">D</th>
                  <th className="px-1 sm:px-2 py-3 w-11 sm:w-14 md:w-16 text-center" title="Saldo de Gols">SG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/50">
                {sortedEntries.map((entry: any) => {
                  const stats = entry.stats;
                  const getStat = (name: string) => stats.find((s: any) => s.name === name)?.displayValue || "0";
                  const teamLogos = extractEspnLogos(entry.team.logos, entry.team.logo);
                  
                  return (
                    <tr key={entry.team.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 sm:px-4 py-3 text-center font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                        {getStat("rank")}
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <ThemeAdaptiveLogo
                            lightSrc={teamLogos.light}
                            darkSrc={teamLogos.dark}
                            alt={entry.team.name}
                            className="w-6 h-6 object-contain shrink-0"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={entry.team.name}>
                            {entry.team.shortDisplayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-1 sm:px-2 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {getStat("points")}
                      </td>
                      <td className="px-1 sm:px-2 py-3 text-center text-slate-600 dark:text-slate-300 tabular-nums">{getStat("gamesPlayed")}</td>
                      <td className="px-1 sm:px-2 py-3 text-center text-slate-600 dark:text-slate-300 tabular-nums">{getStat("wins")}</td>
                      <td className="px-1 sm:px-2 py-3 text-center text-slate-600 dark:text-slate-300 tabular-nums">{getStat("ties")}</td>
                      <td className="px-1 sm:px-2 py-3 text-center text-slate-600 dark:text-slate-300 tabular-nums">{getStat("losses")}</td>
                      <td className="px-1 sm:px-2 py-3 text-center text-slate-600 dark:text-slate-300 font-medium tabular-nums">
                        {getStat("pointDifferential")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        );
      })}
    </div>
  );
}
