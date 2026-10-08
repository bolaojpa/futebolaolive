export interface ESPNScoreboardResponse {
  leagues: {
    id: string;
    uid: string;
    name: string;
    abbreviation: string;
    slug: string;
    logos?: { href: string }[];
  }[];
  events: ESPNEvent[];
}

export interface ESPNEvent {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  status: ESPNStatus;
  competitions: ESPNCompetition[];
}

export interface ESPNStatus {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    id: string;
    name: string;
    state: "pre" | "in" | "post";
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

export interface ESPNCompetition {
  id: string;
  uid: string;
  date: string;
  competitors: ESPNCompetitor[];
  status: ESPNStatus;
}

export interface ESPNCompetitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: "home" | "away";
  winner?: boolean;
  team: ESPNTeam;
  score: string;
  statistics?: { name: string; displayValue: string }[];
}

export interface ESPNTeam {
  id: string;
  uid: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color: string;
  alternateColor: string;
  isActive: boolean;
  logo: string;
}

export interface MatchSummary {
  boxscore: any;
  header: any;
  rosters: any[];
}
