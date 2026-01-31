import fs from "fs";
import path from "path";

type TournamentWeek = {
  weekNumber: number;
  tournamentName: string;
  startDate: Date;
  endDate: Date;
  location: string;
};

let scheduleCache: Map<number, TournamentWeek[]> = new Map();

export function loadSchedule(season: number): TournamentWeek[] {
  if (scheduleCache.has(season)) return scheduleCache.get(season)!;

  const csvPath = path.join(__dirname, `../data/pga-${season}-schedule.csv`);
  if (!fs.existsSync(csvPath)) {
    console.warn(`Schedule CSV not found: ${csvPath}`);
    return [];
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n").slice(1); // skip header

  const schedule = lines
    .filter(line => line.trim())
    .map(line => {
      // Handle commas inside quoted fields
      const parts = line.split(",");
      const weekNumber = parseInt(parts[0], 10);
      const tournamentName = parts[1]?.trim() || "";
      const startDate = parts[2]?.trim() || "";
      const endDate = parts[3]?.trim() || "";
      const location = parts[4]?.trim() || "";

      return {
        weekNumber,
        tournamentName,
        startDate: new Date(startDate + "T00:00:00Z"),
        endDate: new Date(endDate + "T23:59:59Z"),
        location,
      };
    });

  scheduleCache.set(season, schedule);
  return schedule;
}

/**
 * Determine the current week based on today's date and the tournament schedule.
 * 
 * Logic:
 * 1. If a tournament is currently in progress (between start and end date), return that week
 * 2. If we're between tournaments, return the NEXT upcoming week (picks should be open)
 * 3. If season hasn't started or is over, return first/last week
 */
export function getCurrentWeekFromSchedule(season: number): {
  week: number;
  tournament: TournamentWeek | null;
  status: "in_progress" | "upcoming" | "between_weeks" | "season_over" | "no_schedule";
} {
  const schedule = loadSchedule(season);
  if (schedule.length === 0) {
    return { week: 1, tournament: null, status: "no_schedule" };
  }

  const now = new Date();

  // Check if a tournament is currently in progress
  const current = schedule.find(t => now >= t.startDate && now <= t.endDate);
  if (current) {
    return { week: current.weekNumber, tournament: current, status: "in_progress" };
  }

  // Find the next upcoming tournament
  const upcoming = schedule
    .filter(t => t.startDate > now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];

  if (upcoming) {
    return { week: upcoming.weekNumber, tournament: upcoming, status: "upcoming" };
  }

  // All tournaments are in the past - season over
  const last = schedule[schedule.length - 1];
  return { week: last.weekNumber, tournament: last, status: "season_over" };
}

/**
 * Get the pick deadline for a specific week.
 * Deadline = tournament start date minus `hoursBeforeStart` hours.
 * If hoursBeforeStart is 0, deadline is tournament start time.
 */
export function getDeadlineForWeek(
  season: number,
  weekNumber: number,
  hoursBeforeStart: number = 0
): Date | null {
  const schedule = loadSchedule(season);
  const tournament = schedule.find(t => t.weekNumber === weekNumber);
  if (!tournament) return null;

  // Tournament start is Thursday morning typically - use 7AM PST (15:00 UTC)
  const startTime = new Date(tournament.startDate);
  startTime.setUTCHours(15, 0, 0, 0); // 7 AM PST = 15:00 UTC

  const deadline = new Date(startTime.getTime() - hoursBeforeStart * 60 * 60 * 1000);
  return deadline;
}

/**
 * Check if the pick deadline has passed for a given week.
 */
export function hasDeadlinePassed(
  season: number,
  weekNumber: number,
  hoursBeforeStart: number = 0
): boolean {
  const deadline = getDeadlineForWeek(season, weekNumber, hoursBeforeStart);
  if (!deadline) return false;
  return new Date() >= deadline;
}

/**
 * Get tournament info for a specific week number.
 */
export function getTournamentForWeek(
  season: number,
  weekNumber: number
): TournamentWeek | null {
  const schedule = loadSchedule(season);
  return schedule.find(t => t.weekNumber === weekNumber) || null;
}
