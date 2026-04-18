// ESPN Public API integration for live game scores
// Supports NFL and NCAA Men's Basketball (March Madness)

export type SportType = "nfl" | "ncaa_bb";

export interface GameScore {
  espnGameId: string;
  homeTeam: { name: string; abbreviation: string; score: number };
  awayTeam: { name: string; abbreviation: string; score: number };
  status: "scheduled" | "in_progress" | "final";
  period: number;
  periodScores: {
    home: number[]; // Score at end of each completed period
    away: number[];
  };
  clock?: string;
  startTime?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const SPORT_PATHS: Record<SportType, string> = {
  nfl: "football/nfl",
  ncaa_bb: "basketball/mens-college-basketball",
};

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

class SportsApiService {
  private scoreboardCache: Map<string, CacheEntry<GameScore[]>> = new Map();
  private gameCache: Map<string, CacheEntry<GameScore>> = new Map();
  private LIVE_CACHE_TTL = 60 * 1000; // 60 seconds for live games
  private FINAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for completed games

  private parseCompetitor(competitor: any): { name: string; abbreviation: string; score: number; linescores: number[] } {
    const team = competitor.team || {};
    return {
      name: team.displayName || team.name || "Unknown",
      abbreviation: team.abbreviation || "UNK",
      score: parseInt(competitor.score || "0", 10),
      linescores: (competitor.linescores || []).map((ls: any) => ls.value || 0),
    };
  }

  private parseGameStatus(status: any): "scheduled" | "in_progress" | "final" {
    const state = status?.type?.state;
    if (state === "post") return "final";
    if (state === "in") return "in_progress";
    return "scheduled";
  }

  private parseEvent(event: any): GameScore {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors || [];

    const homeData = competitors.find((c: any) => c.homeAway === "home");
    const awayData = competitors.find((c: any) => c.homeAway === "away");

    const home = this.parseCompetitor(homeData || {});
    const away = this.parseCompetitor(awayData || {});

    const statusObj = competition?.status || {};
    const gameStatus = this.parseGameStatus(statusObj);
    const period = statusObj?.period || 0;
    const clock = statusObj?.displayClock;

    return {
      espnGameId: event.id,
      homeTeam: { name: home.name, abbreviation: home.abbreviation, score: home.score },
      awayTeam: { name: away.name, abbreviation: away.abbreviation, score: away.score },
      status: gameStatus,
      period,
      periodScores: {
        home: home.linescores,
        away: away.linescores,
      },
      clock,
      startTime: competition?.date,
    };
  }

  async getScoreboard(sport: SportType, date: string): Promise<GameScore[]> {
    const cacheKey = `${sport}-${date}`;
    const cached = this.scoreboardCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.LIVE_CACHE_TTL) {
      return cached.data;
    }

    try {
      const url = `${ESPN_BASE}/${SPORT_PATHS[sport]}/scoreboard?dates=${date}&limit=100`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }

      const data = await response.json();
      const games = (data.events || []).map((e: any) => this.parseEvent(e));

      this.scoreboardCache.set(cacheKey, { data: games, timestamp: Date.now() });
      return games;
    } catch (error) {
      console.error(`Error fetching ESPN scoreboard for ${sport}:`, error);
      if (cached) return cached.data;
      throw error;
    }
  }

  async getGameScores(espnGameId: string, sport: SportType): Promise<GameScore | null> {
    const cached = this.gameCache.get(espnGameId);
    const ttl = cached?.data.status === "final" ? this.FINAL_CACHE_TTL : this.LIVE_CACHE_TTL;

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    try {
      const url = `${ESPN_BASE}/${SPORT_PATHS[sport]}/summary?event=${espnGameId}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }

      const data = await response.json();

      // The summary endpoint nests the competition differently
      const competition = data.header?.competitions?.[0];
      if (!competition) {
        // Fallback: try the scoreboard for this specific game
        return this.getGameFromScoreboard(espnGameId, sport);
      }

      const competitors = competition.competitors || [];
      const homeData = competitors.find((c: any) => c.homeAway === "home");
      const awayData = competitors.find((c: any) => c.homeAway === "away");

      const parseTeam = (c: any) => ({
        name: c?.team?.displayName || c?.team?.name || "Unknown",
        abbreviation: c?.team?.abbreviation || "UNK",
        score: parseInt(c?.score || "0", 10),
        linescores: (c?.linescores || []).map((ls: any) => ls.value ?? ls ?? 0),
      });

      const home = parseTeam(homeData);
      const away = parseTeam(awayData);

      const statusObj = competition.status?.type || {};
      let gameStatus: "scheduled" | "in_progress" | "final" = "scheduled";
      if (statusObj.state === "post") gameStatus = "final";
      else if (statusObj.state === "in") gameStatus = "in_progress";

      const game: GameScore = {
        espnGameId,
        homeTeam: { name: home.name, abbreviation: home.abbreviation, score: home.score },
        awayTeam: { name: away.name, abbreviation: away.abbreviation, score: away.score },
        status: gameStatus,
        period: competition.status?.period || 0,
        periodScores: {
          home: home.linescores,
          away: away.linescores,
        },
        clock: competition.status?.displayClock,
      };

      this.gameCache.set(espnGameId, { data: game, timestamp: Date.now() });
      return game;
    } catch (error) {
      console.error(`Error fetching ESPN game ${espnGameId}:`, error);
      if (cached) return cached.data;
      return this.getGameFromScoreboard(espnGameId, sport);
    }
  }

  private async getGameFromScoreboard(espnGameId: string, sport: SportType): Promise<GameScore | null> {
    // Try to find the game in today's scoreboard as fallback
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const games = await this.getScoreboard(sport, today);
    return games.find((g) => g.espnGameId === espnGameId) || null;
  }

  async searchGames(sport: SportType, date: string): Promise<GameScore[]> {
    return this.getScoreboard(sport, date);
  }
}

export const sportsApiService = new SportsApiService();
