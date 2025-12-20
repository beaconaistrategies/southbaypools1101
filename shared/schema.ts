import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums for type safety
export const contestStatusEnum = pgEnum("contest_status", ["open", "locked"]);
export const squareStatusEnum = pgEnum("square_status", ["available", "taken", "disabled"]);
export const operatorPlanEnum = pgEnum("operator_plan", ["free", "basic", "pro"]);
export const operatorStatusEnum = pgEnum("operator_status", ["active", "suspended", "trial"]);

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
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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
  notes: text("notes"),
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
  status: golfEntryStatusEnum("status").notNull().default("active"),
  eliminatedWeek: integer("eliminated_week"), // Week when eliminated
  usedGolfers: jsonb("used_golfers").$type<string[]>().default(sql`'[]'::jsonb`), // List of golfer names already used
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  index("golf_pool_entries_pool_idx").on(table.poolId),
  index("golf_pool_entries_email_idx").on(table.email),
]);

export const insertGolfPoolEntrySchema = createInsertSchema(golfPoolEntries).omit({
  id: true,
  createdAt: true,
  eliminatedWeek: true,
  usedGolfers: true,
});

export type InsertGolfPoolEntry = z.infer<typeof insertGolfPoolEntrySchema>;
export type GolfPoolEntry = typeof golfPoolEntries.$inferSelect;

// Golf Picks - Weekly picks for each entry
export const golfPicks = pgTable("golf_picks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: varchar("entry_id").notNull().references(() => golfPoolEntries.id, { onDelete: "cascade" }),
  poolId: varchar("pool_id").notNull().references(() => golfPools.id, { onDelete: "cascade" }),
  tournamentId: varchar("tournament_id").notNull().references(() => golfTournaments.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  golferName: text("golfer_name").notNull(), // Name of the golfer picked
  isAutoPick: boolean("is_auto_pick").notNull().default(false), // True if system auto-picked
  result: golfPickResultEnum("result").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => [
  index("golf_picks_entry_idx").on(table.entryId),
  index("golf_picks_pool_week_idx").on(table.poolId, table.weekNumber),
  uniqueIndex("golf_picks_entry_week_unique").on(table.entryId, table.weekNumber),
]);

export const insertGolfPickSchema = createInsertSchema(golfPicks).omit({
  id: true,
  createdAt: true,
  result: true,
});

export type InsertGolfPick = z.infer<typeof insertGolfPickSchema>;
export type GolfPick = typeof golfPicks.$inferSelect;
