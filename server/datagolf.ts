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
  private CACHE_TTL = 1000 * 60 * 15; // 15 minutes

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

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const dataGolfService = new DataGolfService();
