import { db } from "./db";
import { earningsPools, earningsPoolGolfers, earningsPoolEntries } from "@shared/schema";
import type { EarningsRankingEntry } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { dataGolfService } from "./datagolf";

// Standard PGA Tour payout percentages (top 65 + ties)
const DEFAULT_PAYOUT_PERCENTAGES: { position: number; percentage: number }[] = [
  { position: 1, percentage: 18.0 },
  { position: 2, percentage: 10.9 },
  { position: 3, percentage: 6.9 },
  { position: 4, percentage: 4.9 },
  { position: 5, percentage: 4.1 },
  { position: 6, percentage: 3.625 },
  { position: 7, percentage: 3.375 },
  { position: 8, percentage: 3.125 },
  { position: 9, percentage: 2.925 },
  { position: 10, percentage: 2.725 },
  { position: 11, percentage: 2.525 },
  { position: 12, percentage: 2.325 },
  { position: 13, percentage: 2.125 },
  { position: 14, percentage: 1.925 },
  { position: 15, percentage: 1.725 },
  { position: 16, percentage: 1.525 },
  { position: 17, percentage: 1.425 },
  { position: 18, percentage: 1.325 },
  { position: 19, percentage: 1.225 },
  { position: 20, percentage: 1.125 },
  { position: 21, percentage: 1.025 },
  { position: 22, percentage: 0.925 },
  { position: 23, percentage: 0.858 },
  { position: 24, percentage: 0.791 },
  { position: 25, percentage: 0.725 },
  { position: 26, percentage: 0.658 },
  { position: 27, percentage: 0.625 },
  { position: 28, percentage: 0.591 },
  { position: 29, percentage: 0.558 },
  { position: 30, percentage: 0.525 },
  { position: 31, percentage: 0.491 },
  { position: 32, percentage: 0.458 },
  { position: 33, percentage: 0.425 },
  { position: 34, percentage: 0.4 },
  { position: 35, percentage: 0.375 },
  { position: 36, percentage: 0.35 },
  { position: 37, percentage: 0.325 },
  { position: 38, percentage: 0.308 },
  { position: 39, percentage: 0.291 },
  { position: 40, percentage: 0.275 },
  { position: 41, percentage: 0.258 },
  { position: 42, percentage: 0.241 },
  { position: 43, percentage: 0.225 },
  { position: 44, percentage: 0.208 },
  { position: 45, percentage: 0.197 },
  { position: 46, percentage: 0.186 },
  { position: 47, percentage: 0.175 },
  { position: 48, percentage: 0.166 },
  { position: 49, percentage: 0.158 },
  { position: 50, percentage: 0.152 },
  { position: 51, percentage: 0.148 },
  { position: 52, percentage: 0.144 },
  { position: 53, percentage: 0.14 },
  { position: 54, percentage: 0.138 },
  { position: 55, percentage: 0.136 },
  { position: 56, percentage: 0.134 },
  { position: 57, percentage: 0.132 },
  { position: 58, percentage: 0.131 },
  { position: 59, percentage: 0.13 },
  { position: 60, percentage: 0.129 },
  { position: 61, percentage: 0.128 },
  { position: 62, percentage: 0.127 },
  { position: 63, percentage: 0.126 },
  { position: 64, percentage: 0.125 },
  { position: 65, percentage: 0.124 },
];

/**
 * Parse a position string like "T5", "1", "CUT" into a numeric position.
 * Returns null for non-numeric positions (CUT, WD, DQ, etc.)
 */
function parsePosition(pos: string | null | undefined): number | null {
  if (!pos) return null;
  const cleaned = pos.replace(/^T/, "").trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Calculate earnings for a player based on position and tournament purse.
 * Handles ties by averaging the payouts for the tied positions.
 */
function calculateEarningsFromPosition(
  position: string | null | undefined,
  purseTotalCents: number,
  payoutStructure: { position: number; percentage: number }[],
  allPositions: (string | null | undefined)[]
): number {
  const numPos = parsePosition(position);
  if (numPos === null || numPos < 1) return 0;

  // Find all players tied at this position
  const tiedCount = allPositions.filter(p => parsePosition(p) === numPos).length;
  if (tiedCount === 0) return 0;

  // Sum the payouts for the positions that would be occupied by tied players
  let totalPercentage = 0;
  for (let i = 0; i < tiedCount; i++) {
    const posIndex = numPos + i;
    const payout = payoutStructure.find(p => p.position === posIndex);
    if (payout) {
      totalPercentage += payout.percentage;
    }
  }

  // Each tied player gets equal share
  const perPlayerPercentage = totalPercentage / tiedCount;
  return Math.round((purseTotalCents * perPlayerPercentage) / 100);
}

/**
 * Fetch live tournament data from DataGolf and update golfer positions/earnings.
 * Then re-rank all entries and update the summary cache.
 */
export async function refreshEarningsPool(poolId: string): Promise<EarningsRankingEntry[]> {
  // 1. Get pool config
  const pool = await db.select().from(earningsPools).where(eq(earningsPools.id, poolId)).limit(1);
  if (!pool[0]) throw new Error("Pool not found");
  const poolData = pool[0];

  // 2. Get all golfers in this pool
  const golfers = await db.select().from(earningsPoolGolfers)
    .where(eq(earningsPoolGolfers.poolId, poolId));

  // 3. Fetch live data from DataGolf
  const liveData = await dataGolfService.getLiveTournamentData("pga");

  const payoutStructure = poolData.payoutStructure || DEFAULT_PAYOUT_PERCENTAGES;
  const purseTotalCents = poolData.purseTotalCents || 0;

  if (liveData && liveData.players.length > 0) {
    // Build a map of all live positions for tie calculations
    const allPositions = liveData.players.map(p => p.position);

    // 4. Update each golfer's position and earnings
    for (const golfer of golfers) {
      const livePlayer = liveData.players.find(p => p.dgId === golfer.dgId);

      if (livePlayer) {
        const earnings = calculateEarningsFromPosition(
          livePlayer.position,
          purseTotalCents,
          payoutStructure,
          allPositions
        );

        await db.update(earningsPoolGolfers)
          .set({
            currentPosition: livePlayer.position || null,
            currentEarningsCents: earnings,
            status: livePlayer.status,
          })
          .where(eq(earningsPoolGolfers.id, golfer.id));
      }
    }
  }

  // 5. Re-read updated golfers
  const updatedGolfers = await db.select().from(earningsPoolGolfers)
    .where(eq(earningsPoolGolfers.poolId, poolId));
  const golferMap = new Map(updatedGolfers.map(g => [g.id, g]));

  // 6. Get all entries and calculate totals
  const entries = await db.select().from(earningsPoolEntries)
    .where(eq(earningsPoolEntries.poolId, poolId));

  const rankedEntries: EarningsRankingEntry[] = entries.map(entry => {
    const t1 = golferMap.get(entry.tier1GolferId);
    const t2 = golferMap.get(entry.tier2GolferId);
    const t3 = golferMap.get(entry.tier3GolferId);
    const t4 = golferMap.get(entry.tier4GolferId);

    const golferDetails = [t1, t2, t3, t4].map((g, i) => ({
      tier: i + 1,
      dgId: g?.dgId || 0,
      name: g?.name || "Unknown",
      position: g?.currentPosition || null,
      earnings: g?.currentEarningsCents || 0,
      status: g?.status || "unknown",
    }));

    const totalEarnings = golferDetails.reduce((sum, g) => sum + g.earnings, 0);

    return {
      entryId: entry.id,
      entryName: entry.entryName,
      email: entry.email,
      rank: 0, // will be set after sorting
      totalEarnings,
      golfers: golferDetails,
    };
  });

  // 7. Sort by total earnings descending and assign ranks (handle ties)
  rankedEntries.sort((a, b) => b.totalEarnings - a.totalEarnings);

  let currentRank = 1;
  for (let i = 0; i < rankedEntries.length; i++) {
    if (i > 0 && rankedEntries[i].totalEarnings < rankedEntries[i - 1].totalEarnings) {
      currentRank = i + 1;
    }
    rankedEntries[i].rank = currentRank;
  }

  // 8. Update entry records with new totals and ranks
  for (const entry of rankedEntries) {
    await db.update(earningsPoolEntries)
      .set({
        totalEarningsCents: entry.totalEarnings,
        currentRank: entry.rank,
      })
      .where(eq(earningsPoolEntries.id, entry.entryId));
  }

  // 9. Save summary cache
  await db.update(earningsPools)
    .set({
      rankingsCache: rankedEntries,
      rankingsCacheUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(earningsPools.id, poolId));

  return rankedEntries;
}

/**
 * Auto-assign tiers to golfers based on their DataGolf ranking.
 * Splits field into 4 roughly equal tiers by rank.
 */
export function assignTiers(golferCount: number, index: number): number {
  const quarterSize = Math.ceil(golferCount / 4);
  if (index < quarterSize) return 1;
  if (index < quarterSize * 2) return 2;
  if (index < quarterSize * 3) return 3;
  return 4;
}

// Interval handle for the scoring loop
let scoringIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

/**
 * Start the automated scoring loop for a pool (runs every 5 minutes).
 */
export function startScoringLoop(poolId: string, intervalMs: number = 5 * 60 * 1000): void {
  // Don't start duplicate loops
  if (scoringIntervals.has(poolId)) return;

  console.log(`[EarningsEngine] Starting scoring loop for pool ${poolId} (every ${intervalMs / 1000}s)`);

  const interval = setInterval(async () => {
    try {
      await refreshEarningsPool(poolId);
      console.log(`[EarningsEngine] Refreshed pool ${poolId}`);
    } catch (error) {
      console.error(`[EarningsEngine] Error refreshing pool ${poolId}:`, error);
    }
  }, intervalMs);

  scoringIntervals.set(poolId, interval);
}

/**
 * Stop the scoring loop for a pool.
 */
export function stopScoringLoop(poolId: string): void {
  const interval = scoringIntervals.get(poolId);
  if (interval) {
    clearInterval(interval);
    scoringIntervals.delete(poolId);
    console.log(`[EarningsEngine] Stopped scoring loop for pool ${poolId}`);
  }
}
