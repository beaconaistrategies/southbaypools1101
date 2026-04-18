// Auto-score processing engine
// Polls ESPN for live scores and automatically updates contest winners
//
// Two scoring modes:
//   NFL:     Per-period (Q1, HALF, Q3, FINAL), top axis = one team, left axis = other
//   NCAA BB: Final only, top axis = winner's last digit, left axis = loser's last digit
//            All games in a round share the same grid (layer 0)

import { storage } from "./storage";
import { sportsApiService, type SportType, type GameScore } from "./sportsApi";
import type { LinkedGame, Winner, Prize } from "@shared/schema";

// Period labels for NFL (matches WinnersPanel convention)
const NFL_PERIOD_LABELS = ["Q1", "HALF", "Q3", "FINAL"];

/**
 * Calculate the winning square number from scores and axis numbers.
 *
 * The grid is 10x10 (squares 1-100).
 * Top axis = columns (0-9), Left axis = rows (0-9).
 * Square number = row * 10 + col + 1 (1-indexed)
 */
function calculateWinningSquare(
  topScore: number,
  leftScore: number,
  topAxisNumbers: number[],
  leftAxisNumbers: number[],
): number {
  const topLastDigit = topScore % 10;
  const leftLastDigit = leftScore % 10;

  const col = topAxisNumbers.indexOf(topLastDigit);
  const row = leftAxisNumbers.indexOf(leftLastDigit);

  if (col === -1 || row === -1) {
    console.error(`Could not find digit in axis: top=${topLastDigit} (col=${col}), left=${leftLastDigit} (row=${row})`);
    return -1;
  }

  return row * 10 + col + 1;
}

/**
 * Get cumulative score at the end of a given period from ESPN linescores.
 * ESPN linescores are per-period scores (not cumulative), so we sum them.
 */
function getCumulativeScore(linescores: number[], throughPeriod: number): number {
  let total = 0;
  for (let i = 0; i < throughPeriod && i < linescores.length; i++) {
    total += linescores[i];
  }
  return total;
}

// ==========================================
// NCAA BASKETBALL — FINAL ONLY, WINNER/LOSER
// ==========================================

function processNcaaBBGame(
  game: GameScore,
  linkedGame: LinkedGame,
  topAxisNumbers: number[],
  leftAxisNumbers: number[],
  existingWinners: Winner[],
): { updatedGame: LinkedGame; newWinners: Winner[] } {
  const newWinners: Winner[] = [];

  // Only process when the game is final
  if (game.status !== "final" || linkedGame.periodsProcessed >= 1) {
    return {
      updatedGame: { ...linkedGame, status: game.status },
      newWinners: [],
    };
  }

  // Generate matchup label from team abbreviations (e.g., "SLU-MICH")
  const label = `${game.awayTeam.abbreviation}-${game.homeTeam.abbreviation}`;

  // Skip if winner already exists (manual override protection)
  if (existingWinners.some((w) => w.label === label)) {
    return {
      updatedGame: {
        ...linkedGame,
        status: "final",
        periodsProcessed: 1,
      },
      newWinners: [],
    };
  }

  const homeScore = game.homeTeam.score;
  const awayScore = game.awayTeam.score;

  // Determine winner and loser scores
  const winnerScore = Math.max(homeScore, awayScore);
  const loserScore = Math.min(homeScore, awayScore);

  // Top axis = loser's last digit (columns), Left axis = winner's last digit (rows)
  const squareNumber = calculateWinningSquare(loserScore, winnerScore, topAxisNumbers, leftAxisNumbers);

  if (squareNumber !== -1) {
    newWinners.push({ label, squareNumber });
    const winnerName = homeScore >= awayScore ? game.homeTeam.name : game.awayTeam.name;
    const loserName = homeScore >= awayScore ? game.awayTeam.name : game.homeTeam.name;
    console.log(`Auto-score: ${label} (${winnerName} ${winnerScore} - ${loserName} ${loserScore}) → Square #${squareNumber}`);
  }

  const updatedGame: LinkedGame = {
    ...linkedGame,
    status: "final",
    periodsProcessed: 1,
    lastScores: {
      home: game.periodScores.home,
      away: game.periodScores.away,
    },
    finalScore: { winner: winnerScore, loser: loserScore },
  };

  return { updatedGame, newWinners };
}

// ==========================================
// NFL — PER-PERIOD, HOME/AWAY MAPPING
// ==========================================

function processNflGame(
  game: GameScore,
  linkedGame: LinkedGame,
  topAxisNumbers: number[],
  leftAxisNumbers: number[],
  existingWinners: Winner[],
): { updatedGame: LinkedGame; newWinners: Winner[] } {
  const newWinners: Winner[] = [];
  const totalPeriods = 4;

  // Determine how many periods are actually completed
  let completedPeriods: number;
  if (game.status === "final") {
    completedPeriods = totalPeriods;
  } else if (game.status === "in_progress") {
    completedPeriods = Math.min(
      game.periodScores.home.length,
      game.periodScores.away.length,
      totalPeriods,
    );
  } else {
    completedPeriods = 0;
  }

  // Process each newly completed period
  for (let p = linkedGame.periodsProcessed; p < completedPeriods; p++) {
    const periodLabel = NFL_PERIOD_LABELS[p];
    if (!periodLabel) continue;

    // Build label: "GM1 Q1", "GM1 HALF", etc. (or just "Q1" if gameNumber is 1 and single game)
    const label = linkedGame.gameNumber > 1
      ? `GM${linkedGame.gameNumber} ${periodLabel}`
      : periodLabel;

    // Skip if winner already exists (manual override protection)
    if (existingWinners.some((w) => w.label === label)) continue;

    // Get scores at end of this period
    let homeScore: number;
    let awayScore: number;

    if (p === totalPeriods - 1 && game.status === "final") {
      // Use final total scores (includes OT if any)
      homeScore = game.homeTeam.score;
      awayScore = game.awayTeam.score;
    } else {
      homeScore = getCumulativeScore(game.periodScores.home, p + 1);
      awayScore = getCumulativeScore(game.periodScores.away, p + 1);
    }

    // Map ESPN home/away to contest top/left
    const topScore = linkedGame.topTeamIsHome ? homeScore : awayScore;
    const leftScore = linkedGame.topTeamIsHome ? awayScore : homeScore;

    const squareNumber = calculateWinningSquare(topScore, leftScore, topAxisNumbers, leftAxisNumbers);
    if (squareNumber === -1) continue;

    newWinners.push({ label, squareNumber });
    console.log(`Auto-score: ${label} → Square #${squareNumber} (top=${topScore}, left=${leftScore})`);
  }

  // Handle overtime: if final with OT periods, update the FINAL winner
  if (game.status === "final" && game.periodScores.home.length > totalPeriods) {
    const finalLabel = linkedGame.gameNumber > 1
      ? `GM${linkedGame.gameNumber} FINAL`
      : "FINAL";
    const existingFinalIdx = existingWinners.findIndex((w) => w.label === finalLabel);
    if (existingFinalIdx !== -1) {
      const topScore = linkedGame.topTeamIsHome ? game.homeTeam.score : game.awayTeam.score;
      const leftScore = linkedGame.topTeamIsHome ? game.awayTeam.score : game.homeTeam.score;
      const otSquare = calculateWinningSquare(topScore, leftScore, topAxisNumbers, leftAxisNumbers);

      if (otSquare !== -1 && existingWinners[existingFinalIdx].squareNumber !== otSquare) {
        existingWinners[existingFinalIdx].squareNumber = otSquare;
        console.log(`Auto-score: OT update ${finalLabel} → Square #${otSquare}`);
      }
    }
  }

  const updatedGame: LinkedGame = {
    ...linkedGame,
    status: game.status,
    periodsProcessed: Math.max(linkedGame.periodsProcessed, completedPeriods),
    lastScores: {
      home: game.periodScores.home,
      away: game.periodScores.away,
    },
  };

  return { updatedGame, newWinners };
}

// ==========================================
// MAIN ENTRY POINT
// ==========================================

/**
 * Called by the cron endpoint.
 * Finds all auto-score-enabled contests and processes their linked games.
 */
export async function processAutoScoreContests(): Promise<{
  processed: number;
  updated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let updated = 0;

  try {
    const contests = await storage.getAutoScoreContests();

    if (contests.length === 0) {
      return { processed: 0, updated: 0, errors: [] };
    }

    for (const contest of contests) {
      const linkedGames: LinkedGame[] = (contest.linkedGames as LinkedGame[]) || [];
      if (linkedGames.length === 0) continue;

      // Only process games that aren't fully done
      const activeGames = linkedGames.filter((g) => {
        if (g.status === "final") {
          // NFL: done when 4 periods processed; NCAA BB: done when 1 period processed
          const maxPeriods = g.sport === "nfl" ? 4 : 1;
          return g.periodsProcessed < maxPeriods;
        }
        return true; // scheduled or in_progress
      });

      if (activeGames.length === 0) continue;

      processed++;

      try {
        let existingWinners: Winner[] = [...((contest.winners as Winner[]) || [])];
        let existingPrizes: Prize[] = [...((contest.prizes as Prize[]) || [])];
        const updatedLinkedGames = [...linkedGames];
        let hasChanges = false;

        for (const linkedGame of activeGames) {
          const gameScores = await sportsApiService.getGameScores(
            linkedGame.espnGameId,
            linkedGame.sport,
          );

          if (!gameScores) {
            errors.push(`Could not fetch scores for game ${linkedGame.espnGameId}`);
            continue;
          }

          // Get axis numbers for this layer
          const topAxis = (contest.topAxisNumbers as number[][])?.[linkedGame.layerIndex];
          const leftAxis = (contest.leftAxisNumbers as number[][])?.[linkedGame.layerIndex];

          if (!topAxis || !leftAxis) {
            errors.push(`Missing axis numbers for contest ${contest.id} layer ${linkedGame.layerIndex}`);
            continue;
          }

          // Dispatch to sport-specific handler
          const { updatedGame, newWinners } = linkedGame.sport === "ncaa_bb"
            ? processNcaaBBGame(gameScores, linkedGame, topAxis, leftAxis, existingWinners)
            : processNflGame(gameScores, linkedGame, topAxis, leftAxis, existingWinners);

          // Update the linked game in the array
          const idx = updatedLinkedGames.findIndex(
            (g) => g.espnGameId === linkedGame.espnGameId && g.gameNumber === linkedGame.gameNumber,
          );
          if (idx !== -1) {
            updatedLinkedGames[idx] = updatedGame;
          }

          if (newWinners.length > 0) {
            existingWinners = [...existingWinners, ...newWinners];
            // Auto-create matching prize entries so the grid color system works
            for (const w of newWinners) {
              if (!existingPrizes.some((p) => p.label === w.label)) {
                existingPrizes.push({ label: w.label, amount: "", layerIndex: linkedGame.layerIndex });
              }
            }
            hasChanges = true;
          }

          if (updatedGame.status !== linkedGame.status) {
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await storage.updateContest(contest.id, {
            winners: existingWinners,
            prizes: existingPrizes,
            linkedGames: updatedLinkedGames,
          } as any);
          updated++;
          console.log(`Auto-score: Updated contest ${contest.id} (${contest.name})`);
        }
      } catch (err) {
        const msg = `Error processing contest ${contest.id}: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }
  } catch (err) {
    const msg = `Error in processAutoScoreContests: ${err}`;
    console.error(msg);
    errors.push(msg);
  }

  return { processed, updated, errors };
}
