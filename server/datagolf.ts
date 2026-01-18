interface DataGolfRanking {
  dg_id: number;
  player_name: string;
  country: string;
  owgr_rank: number | null;
  dg_skill_estimate: number;
  datagolf_rank: number;
  primary_tour: string;
}

interface DataGolfFieldPlayer {
  dg_id: number;
  player_name: string;
  country: string;
  am: number;
  dk_salary: number | null;
  fd_salary: number | null;
  early_late_wave?: string;
  teetime?: string;
  course?: string;
}

interface DataGolfFieldResponse {
  event_name: string;
  event_id: string;
  calendar_year: number;
  tour: string;
  field: DataGolfFieldPlayer[];
  last_updated: string;
}

interface DataGolfInPlayPlayer {
  dg_id: number;
  player_name: string;
  country: string;
  current_pos?: string;
  current_score?: number;
  total?: number;
  thru?: number | string;
  round?: number;
  status?: string; // 'CUT', 'WD', 'DQ', or undefined for active
  win?: number;
  top_5?: number;
  top_10?: number;
  top_20?: number;
  make_cut?: number;
}

interface DataGolfInPlayResponse {
  event_name?: string;
  current_round?: number;
  cut_line?: number;
  last_updated?: string;
  players?: DataGolfInPlayPlayer[];
  data?: DataGolfInPlayPlayer[]; // API may return players in 'data' field
  info?: {
    event_name?: string;
    current_round?: number;
    cut_line?: number;
    last_updated?: string;
  };
}

export interface LiveTournamentPlayer {
  dgId: number;
  name: string;
  country: string;
  position?: string;
  score?: number;
  thru?: string;
  round?: number;
  status: 'active' | 'cut' | 'wd' | 'dq';
}

export interface LiveTournamentData {
  eventName: string;
  currentRound: number;
  cutLine?: number;
  lastUpdated: string;
  players: LiveTournamentPlayer[];
}

interface DataGolfRankingsResponse {
  last_updated: string;
  notes: string;
  rankings: DataGolfRanking[];
}

export interface GolferWithRanking {
  dgId: number;
  name: string;
  country: string;
  dgRank: number | null;
  owgrRank: number | null;
  skillEstimate: number | null;
  inField: boolean;
}

export interface TournamentField {
  eventName: string;
  eventId: string;
  tour: string;
  lastUpdated: string;
  golfers: GolferWithRanking[];
}

const DATAGOLF_BASE_URL = "https://feeds.datagolf.com";

class DataGolfService {
  private apiKey: string;
  private rankingsCache: Map<string, { data: DataGolfRanking[]; timestamp: number }> = new Map();
  private fieldCache: Map<string, { data: DataGolfFieldResponse; timestamp: number }> = new Map();
  private inPlayCache: Map<string, { data: DataGolfInPlayResponse; timestamp: number }> = new Map();
  private CACHE_TTL = 1000 * 60 * 15; // 15 minutes
  private IN_PLAY_CACHE_TTL = 1000 * 60 * 5; // 5 minutes for live data

  constructor() {
    this.apiKey = process.env.DATAGOLF_API_KEY || "";
    if (!this.apiKey) {
      console.warn("DATAGOLF_API_KEY not set - DataGolf features will not work");
    }
  }

  private async fetchRankings(): Promise<DataGolfRanking[]> {
    const cacheKey = "rankings";
    const cached = this.rankingsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const url = `${DATAGOLF_BASE_URL}/preds/get-dg-rankings?file_format=json&key=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`DataGolf API error: ${response.status}`);
      }
      
      const data: DataGolfRankingsResponse = await response.json();
      this.rankingsCache.set(cacheKey, { data: data.rankings, timestamp: Date.now() });
      return data.rankings;
    } catch (error) {
      console.error("Error fetching DataGolf rankings:", error);
      const cached = this.rankingsCache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
      throw error;
    }
  }

  private async fetchField(tour: string = "pga"): Promise<DataGolfFieldResponse> {
    const cacheKey = `field-${tour}`;
    const cached = this.fieldCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const url = `${DATAGOLF_BASE_URL}/field-updates?tour=${tour}&file_format=json&key=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`DataGolf API error: ${response.status}`);
      }
      
      const data: DataGolfFieldResponse = await response.json();
      this.fieldCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching DataGolf field:", error);
      const cached = this.fieldCache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
      throw error;
    }
  }

  async getRankings(): Promise<GolferWithRanking[]> {
    const rankings = await this.fetchRankings();
    
    return rankings.map(r => ({
      dgId: r.dg_id,
      name: r.player_name,
      country: r.country,
      dgRank: r.datagolf_rank,
      owgrRank: r.owgr_rank,
      skillEstimate: r.dg_skill_estimate,
      inField: false,
    }));
  }

  async getCurrentField(tour: string = "pga"): Promise<TournamentField> {
    const [fieldData, rankings] = await Promise.all([
      this.fetchField(tour),
      this.fetchRankings(),
    ]);

    const rankingsMap = new Map<number, DataGolfRanking>();
    rankings.forEach(r => rankingsMap.set(r.dg_id, r));

    const golfers: GolferWithRanking[] = fieldData.field.map(player => {
      const ranking = rankingsMap.get(player.dg_id);
      return {
        dgId: player.dg_id,
        name: player.player_name,
        country: player.country,
        dgRank: ranking?.datagolf_rank ?? null,
        owgrRank: ranking?.owgr_rank ?? null,
        skillEstimate: ranking?.dg_skill_estimate ?? null,
        inField: true,
      };
    });

    golfers.sort((a, b) => {
      if (a.dgRank === null && b.dgRank === null) return 0;
      if (a.dgRank === null) return 1;
      if (b.dgRank === null) return -1;
      return a.dgRank - b.dgRank;
    });

    return {
      eventName: fieldData.event_name,
      eventId: fieldData.event_id,
      tour: fieldData.tour,
      lastUpdated: fieldData.last_updated,
      golfers,
    };
  }

  async searchGolfers(query: string): Promise<GolferWithRanking[]> {
    const rankings = await this.getRankings();
    const lowerQuery = query.toLowerCase();
    
    return rankings.filter(g => 
      g.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 50);
  }

  private async fetchInPlay(tour: string = "pga"): Promise<DataGolfInPlayResponse | null> {
    const cacheKey = `inplay-${tour}`;
    const cached = this.inPlayCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.IN_PLAY_CACHE_TTL) {
      return cached.data;
    }

    try {
      const url = `${DATAGOLF_BASE_URL}/preds/in-play?tour=${tour}&file_format=json&key=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No active tournament
          return null;
        }
        throw new Error(`DataGolf API error: ${response.status}`);
      }
      
      const data: DataGolfInPlayResponse = await response.json();
      this.inPlayCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching DataGolf in-play data:", error);
      const cached = this.inPlayCache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
      return null;
    }
  }

  async getLiveTournamentData(tour: string = "pga"): Promise<LiveTournamentData | null> {
    const inPlayData = await this.fetchInPlay(tour);
    
    if (!inPlayData) {
      return null;
    }

    // Handle case where players array might be undefined or in different field
    const rawPlayers = inPlayData.players || (inPlayData as any).data || [];
    if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
      console.warn("DataGolf in-play response has no players data:", Object.keys(inPlayData));
      return null;
    }

    const players: LiveTournamentPlayer[] = rawPlayers.map(player => {
      let status: 'active' | 'cut' | 'wd' | 'dq' = 'active';
      if (player.status === 'CUT' || player.status === 'MC') {
        status = 'cut';
      } else if (player.status === 'WD') {
        status = 'wd';
      } else if (player.status === 'DQ') {
        status = 'dq';
      }

      return {
        dgId: player.dg_id,
        name: player.player_name,
        country: player.country,
        position: player.current_pos,
        score: player.current_score,
        thru: player.thru?.toString(),
        round: player.round,
        status,
      };
    });

    // Extract metadata from either top-level or info object
    const info = inPlayData.info || {};
    const eventName = inPlayData.event_name || info.event_name || "Unknown Tournament";
    const currentRound = inPlayData.current_round ?? info.current_round ?? 0;
    const cutLine = inPlayData.cut_line ?? info.cut_line;
    const lastUpdated = inPlayData.last_updated || info.last_updated || new Date().toISOString();

    return {
      eventName,
      currentRound,
      cutLine,
      lastUpdated,
      players,
    };
  }

  async getPlayerCutStatus(golferName: string, tour: string = "pga"): Promise<'active' | 'cut' | 'wd' | 'dq' | 'unknown'> {
    const liveData = await this.getLiveTournamentData(tour);
    
    if (!liveData) {
      return 'unknown';
    }

    // Normalize names for comparison (handle "Last, First" format)
    const normalizedQuery = golferName.toLowerCase().trim();
    
    const player = liveData.players.find(p => {
      const normalizedName = p.name.toLowerCase().trim();
      // Try exact match first
      if (normalizedName === normalizedQuery) return true;
      // Try partial match (in case of nickname differences)
      const queryParts = normalizedQuery.split(',').map(s => s.trim());
      const nameParts = normalizedName.split(',').map(s => s.trim());
      if (queryParts.length === 2 && nameParts.length === 2) {
        // Compare last name and first initial
        return queryParts[0] === nameParts[0] && 
               (queryParts[1].startsWith(nameParts[1].charAt(0)) || nameParts[1].startsWith(queryParts[1].charAt(0)));
      }
      return false;
    });

    if (player) {
      return player.status;
    }
    
    // If player not found in in-play data and we're past round 2, they likely missed the cut
    // The in-play endpoint only returns players who made the cut
    if (liveData.currentRound >= 3) {
      return 'cut';
    }
    
    return 'unknown';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const dataGolfService = new DataGolfService();
