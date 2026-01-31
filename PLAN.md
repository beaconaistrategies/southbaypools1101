# South Bay Pools — Golf Survivor Fix Plan

## Problems to Fix
1. **Week detection bug** — Picks submitted as week 2 instead of week 3 because auto-detection used tournament name matching (fragile) instead of date-based lookup
2. **Hidden picks logic** — Leaderboard masking depends on the same fragile name matching
3. **Inconsistent week source** — Picks page uses auto-detect API, leaderboard uses `pool.currentWeek` DB value → mismatch

## Solution: Date-Based Week Detection

Replace the complex tournament-name-matching with simple date lookup against the CSV schedule.

---

## Files to Change

### 1. Add Tournament Schedule CSV
**File:** `data/pga-2026-schedule.csv` (already created)

Contains week_number, tournament_name, start_date, end_date for each tournament. This is the **source of truth**.

### 2. Create Schedule Loader Utility
**File:** `server/schedule.ts` (new file)

```typescript
import fs from "fs";
import path from "path";

type TournamentWeek = {
  weekNumber: number;
  tournamentName: string;
  startDate: Date;
  endDate: Date;
  location: string;
};

let scheduleCache: TournamentWeek[] | null = null;

export function loadSchedule(season: number): TournamentWeek[] {
  if (scheduleCache) return scheduleCache;
  
  const csvPath = path.join(__dirname, `../data/pga-${season}-schedule.csv`);
  if (!fs.existsSync(csvPath)) {
    console.warn(`Schedule not found: ${csvPath}`);
    return [];
  }
  
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n").slice(1); // skip header
  
  scheduleCache = lines.map(line => {
    const [weekNumber, tournamentName, startDate, endDate, location] = line.split(",");
    return {
      weekNumber: parseInt(weekNumber, 10),
      tournamentName: tournamentName.trim(),
      startDate: new Date(startDate + "T00:00:00Z"),
      endDate: new Date(endDate + "T23:59:59Z"),
      location: location?.trim() || "",
    };
  });
  
  return scheduleCache;
}

export function getCurrentWeekFromSchedule(season: number): { week: number; tournament: TournamentWeek | null } {
  const schedule = loadSchedule(season);
  const now = new Date();
  
  // Find tournament currently in progress
  const current = schedule.find(t => now >= t.startDate && now <= t.endDate);
  if (current) {
    return { week: current.weekNumber, tournament: current };
  }
  
  // Find next upcoming tournament
  const upcoming = schedule
    .filter(t => t.startDate > now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  
  if (upcoming) {
    return { week: upcoming.weekNumber, tournament: upcoming };
  }
  
  // Season over or not started - return last week
  const last = schedule[schedule.length - 1];
  return { week: last?.weekNumber || 1, tournament: last || null };
}

export function getDeadlineForWeek(season: number, weekNumber: number, hoursBeforeStart: number = 0): Date | null {
  const schedule = loadSchedule(season);
  const tournament = schedule.find(t => t.weekNumber === weekNumber);
  if (!tournament) return null;
  
  const deadline = new Date(tournament.startDate.getTime() - (hoursBeforeStart * 60 * 60 * 1000));
  return deadline;
}

export function hasDeadlinePassed(season: number, weekNumber: number, hoursBeforeStart: number = 0): boolean {
  const deadline = getDeadlineForWeek(season, weekNumber, hoursBeforeStart);
  if (!deadline) return false;
  return new Date() >= deadline;
}
```

### 3. Update Current-Week Endpoint
**File:** `server/routes.ts`
**Location:** Around line 1690 (`app.get("/api/golf/pools/:poolId/current-week"`)

Replace the entire endpoint with:

```typescript
// Auto-detect current week based on schedule CSV (date-based)
app.get("/api/golf/pools/:poolId/current-week", async (req, res) => {
  try {
    const pool = await storage.getGolfPool(req.params.poolId);
    if (!pool) {
      return res.status(404).json({ error: "Pool not found" });
    }
    
    const { week, tournament } = getCurrentWeekFromSchedule(pool.season);
    
    res.json({
      currentWeek: week,
      tournamentName: tournament?.tournamentName || null,
      startDate: tournament?.startDate.toISOString() || null,
      endDate: tournament?.endDate.toISOString() || null,
      detectionMethod: "schedule_csv",
    });
  } catch (error) {
    console.error("Error detecting current week:", error);
    res.status(500).json({ error: "Failed to detect current week" });
  }
});
```

Add import at top of routes.ts:
```typescript
import { getCurrentWeekFromSchedule, hasDeadlinePassed, getDeadlineForWeek } from "./schedule";
```

### 4. Update Leaderboard Endpoint
**File:** `server/routes.ts`
**Location:** Around line 2706 (`app.get("/api/public/golf/pools/:poolId/leaderboard"`)

Replace deadline calculation section (around lines 2730-2810) with:

```typescript
// Get current week from schedule
const { week: currentWeek, tournament: currentTournament } = getCurrentWeekFromSchedule(pool.season);
const pickDeadlineHours = pool.pickDeadlineHours || 0;

// Calculate deadline from schedule
const deadlinePassed = hasDeadlinePassed(pool.season, currentWeek, pickDeadlineHours);
const deadlineTime = getDeadlineForWeek(pool.season, currentWeek, pickDeadlineHours);

// Admin override
const showPicksOverride = pool.showPicksOverride || false;
const shouldReveal = deadlinePassed || showPicksOverride;

// Mask current week picks if deadline hasn't passed
const entriesWithPicks = await Promise.all(
  entries.map(async (entry) => {
    const picks = await storage.getGolfPicks(entry.id);
    
    const maskedPicks = picks.map(pick => {
      const shouldMask = pick.weekNumber === currentWeek && !shouldReveal;
      
      return {
        id: pick.id,
        weekNumber: pick.weekNumber,
        golferName: shouldMask ? "Hidden until deadline" : pick.golferName,
        tournamentName: pick.tournamentName,
        result: pick.result,
        masked: shouldMask,
      };
    });
    
    return {
      id: entry.id,
      entryName: entry.entryName,
      status: entry.status,
      eliminatedWeek: entry.eliminatedWeek,
      picks: maskedPicks,
    };
  })
);

res.json({
  pool: {
    id: pool.id,
    name: pool.name,
    season: pool.season,
    currentWeek: currentWeek,
    status: pool.status,
    pickDeadlineHours: pickDeadlineHours,
  },
  deadlinePassed: shouldReveal,
  deadlineTime: deadlineTime?.toISOString() || null,
  entries: entriesWithPicks,
});
```

### 5. Update Pick Submission Deadline Check
**File:** `server/routes.ts`
**Location:** Around line 2132 (POST pick endpoint deadline check)

Replace the deadline check with:

```typescript
// Check deadline from schedule
const { week: scheduleWeek } = getCurrentWeekFromSchedule(pool.season);
const pickDeadlineHours = pool.pickDeadlineHours || 0;

if (weekNumber !== scheduleWeek) {
  return res.status(400).json({ 
    error: `Cannot submit pick for week ${weekNumber}. Current week is ${scheduleWeek}.` 
  });
}

if (hasDeadlinePassed(pool.season, weekNumber, pickDeadlineHours)) {
  return res.status(400).json({ 
    error: "Pick deadline has passed for this week. Tournament has already started." 
  });
}
```

---

## Alternative: Simple Monday Cron

If you prefer not to maintain the CSV, add a cron job that bumps `pool.currentWeek` every Monday at noon:

```sql
-- Run this every Monday at 12:00 PM Pacific
UPDATE golf_pools 
SET current_week = current_week + 1 
WHERE status = 'active' AND season = 2026;
```

In Replit, you can set this up via a scheduled function or external cron service.

**Downside:** If a week gets skipped (canceled tournament), you need manual adjustment.

---

## Testing Checklist

- [ ] Picks page shows correct week (Week 3 = Farmers Insurance Open)
- [ ] Submitting a pick saves with correct week number
- [ ] Leaderboard shows same week as picks page
- [ ] Picks are hidden until tournament start (Thursday 7am local / adjustable)
- [ ] Picks reveal once tournament begins
- [ ] Cannot submit pick for past weeks
- [ ] Cannot submit pick after deadline

---

## Files Summary

| File | Action |
|------|--------|
| `data/pga-2026-schedule.csv` | ADD (tournament schedule) |
| `server/schedule.ts` | ADD (date-based week detection) |
| `server/routes.ts` | EDIT (current-week endpoint, leaderboard, pick submission) |

