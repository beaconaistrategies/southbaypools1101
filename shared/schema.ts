import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums for type safety
export const contestStatusEnum = pgEnum("contest_status", ["open", "locked"]);
export const squareStatusEnum = pgEnum("square_status", ["available", "taken", "disabled"]);
export const operatorPlanEnum = pgEnum("operator_plan", ["free", "basic", "pro"]);
export const operatorStatusEnum = pgEnum("operator_status", ["active", "suspended", "trial"]);
export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "manager", "member", "trial"]);

// Operators table - represents a pool operator/tenant
export const operators = pgTable("operators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  plan: operatorPlanEnum("plan").notNull().default("free"),
  status: operatorStatusEnum("status").notNull().default("trial"),
  billingCustomerId: varchar("billing_customer_id"),
  maxContests: integer("max_contests").notNull().default(3),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertOperatorSchema = createInsertSchema(operators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOperator = z.infer<typeof insertOperatorSchema>;
export type Operator = typeof operators.$inferSelect;

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("member"),
  isAdmin: boolean("is_admin").notNull().default(false), // Deprecated: use role instead
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Role hierarchy for permission checks (higher index = more permissions)
export const ROLE_HIERARCHY = ["trial", "member", "manager", "admin", "super_admin"] as const;
export type UserRole = typeof ROLE_HIERARCHY[number];

// Helper to check if a role has at least the required permission level
export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

// Contest Managers - junction table for manager-contest assignments
export const contestManagers = pgTable("contest_managers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contestId: varchar("contest_id").notNull().references(() => contests.id, { onDelete: "cascade" }),
  operatorId: varchar("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("contest_managers_user_contest_unique").on(table.userId, table.contestId),
  index("contest_managers_user_idx").on(table.userId),
  index("contest_managers_contest_idx").on(table.contestId),
]);

export const insertContestManagerSchema = createInsertSchema(contestManagers).omit({
  id: true,
  createdAt: true,
});

export type InsertContestManager = z.infer<typeof insertContestManagerSchema>;
export type ContestManager = typeof contestManagers.$inferSelect;

// Participants table - master accounts for pool participants (separate from admin users)
export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authId: varchar("auth_id").unique(), // Replit Auth sub claim
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

export type Prize = {
  label: string;
  amount: string;
  layerIndex?: number; // Optional: which layer/game this prize belongs to (0-indexed)
};

export type Winner = {
  label: string;
  squareNumber: number;
};

export const folders = pgTable("folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("folders_operator_name_unique").on(table.operatorId, table.name),
]);

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
  createdAt: true,
});

export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;

export const contests = pgTable("contests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }),
  eventDate: timestamp("event_date").notNull(),
  topTeam: text("top_team").notNull(),
  leftTeam: text("left_team").notNull(),
  notes: text("notes"),
  folderId: varchar("folder_id").references(() => folders.id, { onDelete: "set null" }),
  topAxisNumbers: jsonb("top_axis_numbers").notNull().$type<number[][]>(),
  leftAxisNumbers: jsonb("left_axis_numbers").notNull().$type<number[][]>(),
  layerLabels: jsonb("layer_labels").$type<string[]>(),
  redRowsCount: integer("red_rows_count").notNull().default(2),
  showRedHeaders: boolean("show_red_headers").notNull().default(false),
  headerColorsEnabled: boolean("header_colors_enabled").notNull().default(true),
  layerColors: jsonb("layer_colors").$type<string[]>(),
  layerColorGroups: jsonb("layer_color_groups").$type<number[]>(),
  status: contestStatusEnum("status").notNull().default("open"),
  prizes: jsonb("prizes").$type<Prize[]>().default(sql`'[]'::jsonb`),
  winners: jsonb("winners").$type<Winner[]>().default(sql`'[]'::jsonb`),
  q1Winner: text("q1_winner"),
  q2Winner: text("q2_winner"),
  q3Winner: text("q3_winner"),
  q4Winner: text("q4_winner"),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("contests_operator_slug_unique").on(table.operatorId, table.slug),
]);

// Reserved slugs that cannot be used for contests
const RESERVED_SLUGS = [
  'admin', 'login', 'board', 'my-contests', 'api', 
  'logout', 'auth', 'contest', 'contests', 'folder', 'folders'
];

const baseContestSchema = createInsertSchema(contests).omit({
  id: true,
  createdAt: true,
}).extend({
  slug: z.union([
    z.string()
      .max(100, "URL slug must be 100 characters or less")
      .regex(/^[a-z0-9-]+$/, "URL slug can only contain lowercase letters, numbers, and hyphens")
      .refine(val => !RESERVED_SLUGS.includes(val), {
        message: `This URL is reserved. Please choose a different one.`
      }),
    z.literal('').transform(() => undefined),
    z.undefined()
  ]),
  topAxisNumbers: z.array(z.array(z.number().min(0).max(9)).length(10)),
  leftAxisNumbers: z.array(z.array(z.number().min(0).max(9)).length(10)),
  layerLabels: z.array(z.string()).optional(),
  redRowsCount: z.number().min(1).max(6),
  headerColorsEnabled: z.boolean().optional(),
  layerColors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(),
  layerColorGroups: z.array(z.number().min(0)).optional(),
  status: z.enum(["open", "locked"]).optional(),
});

export const insertContestSchema = baseContestSchema.refine(
  (data) => data.topAxisNumbers.length === data.redRowsCount,
  { message: "topAxisNumbers length must match redRowsCount" }
).refine(
  (data) => data.leftAxisNumbers.length === data.redRowsCount,
  { message: "leftAxisNumbers length must match redRowsCount" }
);

export const updateContestSchema = baseContestSchema.partial();

export type InsertContest = z.infer<typeof insertContestSchema>;
export type UpdateContest = z.infer<typeof updateContestSchema>;
export type Contest = typeof contests.$inferSelect;

export const squares = pgTable("squares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contestId: varchar("contest_id").notNull().references(() => contests.id, { onDelete: "cascade" }),
  index: integer("index").notNull(),
  row: integer("row").notNull(),
  col: integer("col").notNull(),
  status: squareStatusEnum("status").notNull().default("available"),
  entryName: text("entry_name"),
  holderName: text("holder_name"),
  holderEmail: text("holder_email"),
  participantId: varchar("participant_id").references(() => participants.id, { onDelete: "set null" }),
});

export const insertSquareSchema = createInsertSchema(squares).omit({
  id: true,
}).extend({
  status: z.enum(["available", "taken", "disabled"]).optional(),
  index: z.number().min(1).max(100),
  row: z.number().min(0).max(9),
  col: z.number().min(0).max(9),
});

export const updateSquareSchema = insertSquareSchema.partial().omit({
  contestId: true,
  index: true,
  row: true,
  col: true,
});

export type InsertSquare = z.infer<typeof insertSquareSchema>;
export type UpdateSquare = z.infer<typeof updateSquareSchema>;
export type Square = typeof squares.$inferSelect;

// ==========================================
// GOLF SURVIVOR SCHEMA
// ==========================================

export const golfPoolStatusEnum = pgEnum("golf_pool_status", ["upcoming", "active", "completed"]);
export const golfEntryStatusEnum = pgEnum("golf_entry_status", ["active", "eliminated"]);
export const golfPickResultEnum = pgEnum("golf_pick_result", ["pending", "survived", "eliminated"]);

// Golf Tournaments - PGA Tour schedule
export const golfTournaments = pgTable("golf_tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  season: integer("season").notNull(), // e.g., 2025
  weekNumber: integer("week_number"), // Week in the survivor pool
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertGolfTournamentSchema = createInsertSchema(golfTournaments).omit({
  id: true,
  createdAt: true,
});

export type InsertGolfTournament = z.infer<typeof insertGolfTournamentSchema>;
export type GolfTournament = typeof golfTournaments.$inferSelect;

// Golf Pools - Survivor pool instances
export const golfPools = pgTable("golf_pools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }),
  season: integer("season").notNull(), // e.g., 2025
  entryFee: text("entry_fee"), // Display string like "$50"
  prizePool: text("prize_pool"), // Display string like "$500"
  status: golfPoolStatusEnum("status").notNull().default("upcoming"),
  currentWeek: integer("current_week").default(1),
  pickDeadlineHours: integer("pick_deadline_hours").default(0), // Hours before tournament start
  showPicksOverride: boolean("show_picks_override").default(false), // Admin override to show all picks regardless of deadline
  notes: text("notes"),
  webhookUrl: text("webhook_url"), // n8n webhook URL for pick notifications
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("golf_pools_operator_slug_unique").on(table.operatorId, table.slug),
]);

export const insertGolfPoolSchema = createInsertSchema(golfPools).omit({
  id: true,
  createdAt: true,
}).extend({
  slug: z.union([
    z.string()
      .max(100, "URL slug must be 100 characters or less")
      .regex(/^[a-z0-9-]+$/, "URL slug can only contain lowercase letters, numbers, and hyphens"),
    z.literal('').transform(() => undefined),
    z.undefined()
  ]),
});

export type InsertGolfPool = z.infer<typeof insertGolfPoolSchema>;
export type GolfPool = typeof golfPools.$inferSelect;

// Golf Pool Entries - Participants in a pool
export const golfPoolEntries = pgTable("golf_pool_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").notNull().references(() => golfPools.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id").references(() => participants.id, { onDelete: "set null" }),
  entryName: text("entry_name").notNull(), // Display name for this entry
  email: text("email").notNull(),
  manageToken: varchar("manage_token").default(sql`gen_random_uuid()`), // Unique token for entry management access
  status: golfEntryStatusEnum("status").notNull().default("active"),
  eliminatedWeek: integer("eliminated_week"), // Week when eliminated
  usedGolfers: jsonb("used_golfers").$type<string[]>().default(sql`'[]'::jsonb`), // List of golfer names already used
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  index("golf_pool_entries_pool_idx").on(table.poolId),
  index("golf_pool_entries_email_idx").on(table.email),
  index("golf_pool_entries_token_idx").on(table.manageToken),
]);

export const insertGolfPoolEntrySchema = createInsertSchema(golfPoolEntries).omit({
  id: true,
  createdAt: true,
  eliminatedWeek: true,
  usedGolfers: true,
  manageToken: true,
});

export type InsertGolfPoolEntry = z.infer<typeof insertGolfPoolEntrySchema>;
export type GolfPoolEntry = typeof golfPoolEntries.$inferSelect;

// Golf Picks - Weekly picks for each entry
export const golfPicks = pgTable("golf_picks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: varchar("entry_id").notNull().references(() => golfPoolEntries.id, { onDelete: "cascade" }),
  poolId: varchar("pool_id").notNull().references(() => golfPools.id, { onDelete: "cascade" }),
  tournamentId: varchar("tournament_id").references(() => golfTournaments.id, { onDelete: "set null" }),
  tournamentName: text("tournament_name"), // Store tournament name for display (from DataGolf or manual entry)
  weekNumber: integer("week_number").notNull(),
  golferName: text("golfer_name").notNull(), // Name of the golfer picked
  isAutoPick: boolean("is_auto_pick").notNull().default(false), // True if system auto-picked
  result: golfPickResultEnum("result").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => [
  index("golf_picks_entry_idx").on(table.entryId),
  index("golf_picks_pool_week_idx").on(table.poolId, table.weekNumber),
  uniqueIndex("golf_picks_entry_week_unique").on(table.entryId, table.weekNumber),
]);

export const insertGolfPickSchema = createInsertSchema(golfPicks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  result: true,
});

export type InsertGolfPick = z.infer<typeof insertGolfPickSchema>;
export type GolfPick = typeof golfPicks.$inferSelect;

// Golf Pick History - Audit trail for pick changes
export const golfPickHistory = pgTable("golf_pick_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pickId: varchar("pick_id").notNull().references(() => golfPicks.id, { onDelete: "cascade" }),
  entryId: varchar("entry_id").notNull().references(() => golfPoolEntries.id, { onDelete: "cascade" }),
  poolId: varchar("pool_id").notNull().references(() => golfPools.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  golferName: text("golfer_name").notNull(), // The golfer that was originally picked
  tournamentName: text("tournament_name"),
  changedAt: timestamp("changed_at").notNull().default(sql`now()`), // When the pick was changed
  changedBy: text("changed_by"), // Who changed it: "user", "admin", "system"
  reason: text("reason"), // Optional reason for the change
}, (table) => [
  index("golf_pick_history_pick_idx").on(table.pickId),
  index("golf_pick_history_entry_idx").on(table.entryId),
  index("golf_pick_history_pool_week_idx").on(table.poolId, table.weekNumber),
]);

export const insertGolfPickHistorySchema = createInsertSchema(golfPickHistory).omit({
  id: true,
  changedAt: true,
});

export type InsertGolfPickHistory = z.infer<typeof insertGolfPickHistorySchema>;
export type GolfPickHistory = typeof golfPickHistory.$inferSelect;

// ==========================================
// SQUARE TEMPLATES SCHEMA
// ==========================================

// Reserved square entry for templates
export type TemplateSquare = {
  index: number;
  entryName: string;
  holderName: string;
  holderEmail: string;
};

// Square Templates - reusable reserved square configurations
export const squareTemplates = pgTable("square_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  squares: jsonb("squares").$type<TemplateSquare[]>().notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  index("square_templates_operator_idx").on(table.operatorId),
]);

export const insertSquareTemplateSchema = createInsertSchema(squareTemplates).omit({
  id: true,
  createdAt: true,
}).extend({
  squares: z.array(z.object({
    index: z.number().min(1).max(100),
    entryName: z.string(),
    holderName: z.string(),
    holderEmail: z.string().email(),
  })),
});

export type InsertSquareTemplate = z.infer<typeof insertSquareTemplateSchema>;
export type SquareTemplate = typeof squareTemplates.$inferSelect;

// ==========================================
// EARNINGS POOL SCHEMA (Tiered Golf Earnings)
// ==========================================

export const earningsPoolStatusEnum = pgEnum("earnings_pool_status", ["setup", "open", "locked", "live", "completed"]);

// Earnings Pools - pool instances for tiered golf earnings contests
export const earningsPools = pgTable("earnings_pools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }),
  tournamentName: text("tournament_name").notNull(),
  tournamentDgId: varchar("tournament_dg_id"), // DataGolf event ID
  season: integer("season").notNull(),
  entryFee: text("entry_fee"),
  maxEntriesPerEmail: integer("max_entries_per_email").notNull().default(1),
  status: earningsPoolStatusEnum("status").notNull().default("setup"),
  notes: text("notes"),
  // Prize purse data (from DataGolf or manual)
  purseTotalCents: integer("purse_total_cents"), // Total tournament purse in cents
  payoutStructure: jsonb("payout_structure").$type<{ position: number; percentage: number }[]>(),
  // Summary cache - pre-calculated rankings for fast reads
  rankingsCache: jsonb("rankings_cache").$type<EarningsRankingEntry[]>(),
  rankingsCacheUpdatedAt: timestamp("rankings_cache_updated_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("earnings_pools_operator_slug_unique").on(table.operatorId, table.slug),
]);

export type EarningsRankingEntry = {
  entryId: string;
  entryName: string;
  email: string;
  rank: number;
  totalEarnings: number; // cents
  golfers: {
    tier: number;
    dgId: number;
    name: string;
    position: string | null;
    earnings: number; // cents
    status: string;
  }[];
};

export const insertEarningsPoolSchema = createInsertSchema(earningsPools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  rankingsCache: true,
  rankingsCacheUpdatedAt: true,
}).extend({
  slug: z.union([
    z.string()
      .max(100, "URL slug must be 100 characters or less")
      .regex(/^[a-z0-9-]+$/, "URL slug can only contain lowercase letters, numbers, and hyphens"),
    z.literal('').transform(() => undefined),
    z.undefined()
  ]),
});

export type InsertEarningsPool = z.infer<typeof insertEarningsPoolSchema>;
export type EarningsPool = typeof earningsPools.$inferSelect;

// Earnings Pool Golfers - the "Athlete Registry" with tier assignments
export const earningsPoolGolfers = pgTable("earnings_pool_golfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").notNull().references(() => earningsPools.id, { onDelete: "cascade" }),
  dgId: integer("dg_id").notNull(), // DataGolf player ID
  name: text("name").notNull(),
  country: text("country"),
  tier: integer("tier").notNull(), // 1, 2, 3, or 4
  dgRank: integer("dg_rank"),
  owgrRank: integer("owgr_rank"),
  currentPosition: text("current_position"), // Live tournament position
  currentEarningsCents: integer("current_earnings_cents").notNull().default(0),
  status: text("status").notNull().default("active"), // active, cut, wd, dq
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  index("earnings_pool_golfers_pool_idx").on(table.poolId),
  uniqueIndex("earnings_pool_golfers_pool_dg_unique").on(table.poolId, table.dgId),
  index("earnings_pool_golfers_tier_idx").on(table.poolId, table.tier),
]);

export const insertEarningsPoolGolferSchema = createInsertSchema(earningsPoolGolfers).omit({
  id: true,
  createdAt: true,
  currentPosition: true,
  currentEarningsCents: true,
  status: true,
});

export type InsertEarningsPoolGolfer = z.infer<typeof insertEarningsPoolGolferSchema>;
export type EarningsPoolGolfer = typeof earningsPoolGolfers.$inferSelect;

// Earnings Pool Entries - the "Entry Ledger" with 4 picks (one per tier)
export const earningsPoolEntries = pgTable("earnings_pool_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").notNull().references(() => earningsPools.id, { onDelete: "cascade" }),
  entryName: text("entry_name").notNull(),
  email: text("email").notNull(),
  tier1GolferId: varchar("tier1_golfer_id").notNull().references(() => earningsPoolGolfers.id),
  tier2GolferId: varchar("tier2_golfer_id").notNull().references(() => earningsPoolGolfers.id),
  tier3GolferId: varchar("tier3_golfer_id").notNull().references(() => earningsPoolGolfers.id),
  tier4GolferId: varchar("tier4_golfer_id").notNull().references(() => earningsPoolGolfers.id),
  totalEarningsCents: integer("total_earnings_cents").notNull().default(0),
  currentRank: integer("current_rank"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  index("earnings_pool_entries_pool_idx").on(table.poolId),
  index("earnings_pool_entries_email_idx").on(table.email),
  index("earnings_pool_entries_rank_idx").on(table.poolId, table.currentRank),
]);

export const insertEarningsPoolEntrySchema = createInsertSchema(earningsPoolEntries).omit({
  id: true,
  createdAt: true,
  totalEarningsCents: true,
  currentRank: true,
});

export type InsertEarningsPoolEntry = z.infer<typeof insertEarningsPoolEntrySchema>;
export type EarningsPoolEntry = typeof earningsPoolEntries.$inferSelect;
