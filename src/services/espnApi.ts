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

// Cache em memória para jogos passados finalizados na Home (evita dezenas de requisições repetidas a cada 30s)
let pastEventsCache: { timestamp: number; events: any[] } | null = null;
const PAST_CACHE_TTL = 5 * 60 * 1000; // 5 minutos de cache

export const fetchScoreboard = async (
  leagueSlug: string = "uefa.champions",
  date?: string // Formato: YYYYMMDD
): Promise<ESPNScoreboardResponse> => {
  const params: any = { lang: "pt", region: "br", _t: Date.now() };
  if (date) params.dates = date;

  if (leagueSlug === "all") {
    // Para a Home, busca:
    // 1. Jogos atuais da rodada (ao vivo e de hoje)
    // 2. Jogos de amanhã (próximos jogos)
    // 3. Jogos dos últimos 5 dias (para garantir os 9 últimos jogos finalizados de todas as ligas)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10).replace(/-/g, '');

    const currentRoundPromises = ALL_LEAGUES_SLUGS.map((slug) =>
      axios.get(`${ESPN_BASE_URL}/${slug}/scoreboard`, { 
        params: { ...params } 
      }).then(res => ({
        data: res.data,
        slug
      })).catch(() => null)
    );

    const tomorrowPromises = ALL_LEAGUES_SLUGS.map((slug) =>
      axios.get(`${ESPN_BASE_URL}/${slug}/scoreboard`, { 
        params: { ...params, dates: tomorrowStr } 
      }).then(res => ({
        data: res.data,
        slug
      })).catch(() => null)
    );

    // Recupera ou busca os jogos dos últimos 5 dias
    const now = Date.now();
    const isPastCacheValid = pastEventsCache && (now - pastEventsCache.timestamp < PAST_CACHE_TTL);

    let pastEvents: any[] = [];
    if (isPastCacheValid && pastEventsCache) {
      pastEvents = pastEventsCache.events;
    } else {
      const pastDates = [1, 2, 3, 4, 5].map((daysAgo) => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().slice(0, 10).replace(/-/g, '');
      });

      const pastPromises = ALL_LEAGUES_SLUGS.flatMap((slug) =>
        pastDates.map((dateStr) =>
          axios.get(`${ESPN_BASE_URL}/${slug}/scoreboard`, {
            params: { ...params, dates: dateStr }
          }).then(res => ({
            data: res.data,
            slug
          })).catch(() => null)
        )
      );

      const pastResults = await Promise.all(pastPromises);
      const pastMap = new Map<string, any>();
      pastResults.forEach((res) => {
        if (res && res.data && res.data.events) {
          res.data.events.forEach((e: any) => {
            if (!pastMap.has(e.id)) {
              pastMap.set(e.id, {
                ...e,
                _customLeagueSlug: res.slug,
                _customLeagueLogo: res.data.leagues?.[0]?.logos?.[0]?.href
              });
            }
          });
        }
      });
      pastEvents = Array.from(pastMap.values());
      pastEventsCache = { timestamp: now, events: pastEvents };
    }

    const liveResults = await Promise.all([...currentRoundPromises, ...tomorrowPromises]);
    const eventMap = new Map<string, any>();

    // Insere os jogos passados no mapa
    pastEvents.forEach((e) => {
      eventMap.set(e.id, e);
    });

    // Insere e sobrescreve com os dados mais recentes da rodada atual e de amanhã
    liveResults.forEach((res) => {
      if (res && res.data && res.data.events) {
        res.data.events.forEach((e: any) => {
          eventMap.set(e.id, {
            ...e,
            _customLeagueSlug: res.slug,
            _customLeagueLogo: res.data.leagues?.[0]?.logos?.[0]?.href
          });
        });
      }
    });

    return {
      leagues: [],
      events: Array.from(eventMap.values())
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
