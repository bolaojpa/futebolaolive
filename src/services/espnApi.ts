import axios from "axios";
import { ESPNScoreboardResponse, MatchSummary } from "@/types/espn";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const ALL_LEAGUES_SLUGS = [
  "uefa.champions",
  "conmebol.libertadores",
  "eng.1",
  "bra.1",
  "esp.1",
  "ger.1",
  "ita.1"
];

export const fetchScoreboard = async (
  leagueSlug: string = "uefa.champions",
  date?: string // Formato: YYYYMMDD
): Promise<ESPNScoreboardResponse> => {
  const params: any = { lang: "pt", region: "br" };
  if (date) params.dates = date;

  if (leagueSlug === "all") {
    // Busca todas as ligas rastreadas no sistema (Para a Home, mantém o comportamento padrão de rodada para performance)
    const promises = ALL_LEAGUES_SLUGS.map((slug) =>
      axios.get(`${ESPN_BASE_URL}/${slug}/scoreboard`, { params }).then(res => ({
        data: res.data,
        slug
      })).catch(() => null)
    );

    const results = await Promise.all(promises);
    let allEvents: any[] = [];

    results.forEach((res) => {
      if (res && res.data && res.data.events) {
        // Injeta o league slug e logo dentro de cada evento para o MatchCard identificar
        const eventsWithLeague = res.data.events.map((e: any) => ({
          ...e,
          _customLeagueSlug: res.slug,
          _customLeagueLogo: res.data.leagues?.[0]?.logos?.[0]?.href
        }));
        allEvents = [...allEvents, ...eventsWithLeague];
      }
    });

    return {
      leagues: [],
      events: allEvents
    } as unknown as ESPNScoreboardResponse;
  }

  // Para ligas específicas, busca o calendário com limite alto para garantir todas as partidas do ano
  if (!date) {
    params.dates = new Date().getFullYear().toString();
  }
  params.limit = 1000;

  const response = await axios.get(`${ESPN_BASE_URL}/${leagueSlug}/scoreboard`, { params });
  return response.data;
};

export const fetchMatchSummary = async (leagueSlug: string, eventId: string): Promise<MatchSummary> => {
  const response = await axios.get(`${ESPN_BASE_URL}/${leagueSlug}/summary`, {
    params: { event: eventId, lang: "pt", region: "br" }
  });
  return response.data;
};

export const fetchStandings = async (leagueSlug: string): Promise<any> => {
  // O endpoint de standings usa apis/v2/sports/soccer/.../standings
  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${leagueSlug}/standings`;
  const response = await axios.get(url, {
    params: { lang: "pt", region: "br" }
  });
  return response.data;
};
