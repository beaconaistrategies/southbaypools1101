var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  ROLE_HIERARCHY: () => ROLE_HIERARCHY,
  contestManagers: () => contestManagers,
  contestStatusEnum: () => contestStatusEnum,
  contests: () => contests,
  earningsPoolEntries: () => earningsPoolEntries,
  earningsPoolGolfers: () => earningsPoolGolfers,
  earningsPoolStatusEnum: () => earningsPoolStatusEnum,
  earningsPools: () => earningsPools,
  folders: () => folders,
  golfEntryStatusEnum: () => golfEntryStatusEnum,
  golfPickHistory: () => golfPickHistory,
  golfPickResultEnum: () => golfPickResultEnum,
  golfPicks: () => golfPicks,
  golfPoolEntries: () => golfPoolEntries,
  golfPoolStatusEnum: () => golfPoolStatusEnum,
  golfPools: () => golfPools,
  golfTournaments: () => golfTournaments,
  hasRolePermission: () => hasRolePermission,
  insertContestManagerSchema: () => insertContestManagerSchema,
  insertContestSchema: () => insertContestSchema,
  insertEarningsPoolEntrySchema: () => insertEarningsPoolEntrySchema,
  insertEarningsPoolGolferSchema: () => insertEarningsPoolGolferSchema,
  insertEarningsPoolSchema: () => insertEarningsPoolSchema,
  insertFolderSchema: () => insertFolderSchema,
  insertGolfPickHistorySchema: () => insertGolfPickHistorySchema,
  insertGolfPickSchema: () => insertGolfPickSchema,
  insertGolfPoolEntrySchema: () => insertGolfPoolEntrySchema,
  insertGolfPoolSchema: () => insertGolfPoolSchema,
  insertGolfTournamentSchema: () => insertGolfTournamentSchema,
  insertOperatorSchema: () => insertOperatorSchema,
  insertParticipantSchema: () => insertParticipantSchema,
  insertSquareSchema: () => insertSquareSchema,
  insertSquareTemplateSchema: () => insertSquareTemplateSchema,
  operatorPlanEnum: () => operatorPlanEnum,
  operatorStatusEnum: () => operatorStatusEnum,
  operators: () => operators,
  participants: () => participants,
  sessions: () => sessions,
  squareStatusEnum: () => squareStatusEnum,
  squareTemplates: () => squareTemplates,
  squares: () => squares,
  updateContestSchema: () => updateContestSchema,
  updateSquareSchema: () => updateSquareSchema,
  userRoleEnum: () => userRoleEnum,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
function hasRolePermission(userRole, requiredRole) {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}
var contestStatusEnum, squareStatusEnum, operatorPlanEnum, operatorStatusEnum, userRoleEnum, operators, insertOperatorSchema, sessions, users, ROLE_HIERARCHY, contestManagers, insertContestManagerSchema, participants, insertParticipantSchema, folders, insertFolderSchema, contests, RESERVED_SLUGS, baseContestSchema, insertContestSchema, updateContestSchema, squares, insertSquareSchema, updateSquareSchema, golfPoolStatusEnum, golfEntryStatusEnum, golfPickResultEnum, golfTournaments, insertGolfTournamentSchema, golfPools, insertGolfPoolSchema, golfPoolEntries, insertGolfPoolEntrySchema, golfPicks, insertGolfPickSchema, golfPickHistory, insertGolfPickHistorySchema, squareTemplates, insertSquareTemplateSchema, earningsPoolStatusEnum, earningsPools, insertEarningsPoolSchema, earningsPoolGolfers, insertEarningsPoolGolferSchema, earningsPoolEntries, insertEarningsPoolEntrySchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    contestStatusEnum = pgEnum("contest_status", ["open", "locked"]);
    squareStatusEnum = pgEnum("square_status", ["available", "taken", "disabled"]);
    operatorPlanEnum = pgEnum("operator_plan", ["free", "basic", "pro"]);
    operatorStatusEnum = pgEnum("operator_status", ["active", "suspended", "trial"]);
    userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "manager", "member", "trial"]);
    operators = pgTable("operators", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      slug: varchar("slug", { length: 100 }).unique().notNull(),
      plan: operatorPlanEnum("plan").notNull().default("free"),
      status: operatorStatusEnum("status").notNull().default("trial"),
      billingCustomerId: varchar("billing_customer_id"),
      maxContests: integer("max_contests").notNull().default(3),
      createdAt: timestamp("created_at").notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
    });
    insertOperatorSchema = createInsertSchema(operators).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
      email: varchar("email").unique(),
      passwordHash: varchar("password_hash"),
      firstName: varchar("first_name"),
      lastName: varchar("last_name"),
      profileImageUrl: varchar("profile_image_url"),
      role: userRoleEnum("role").notNull().default("member"),
      isAdmin: boolean("is_admin").notNull().default(false),
      // Deprecated: use role instead
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    ROLE_HIERARCHY = ["trial", "member", "manager", "admin", "super_admin"];
    contestManagers = pgTable("contest_managers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      contestId: varchar("contest_id").notNull().references(() => contests.id, { onDelete: "cascade" }),
      operatorId: varchar("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").notNull().default(sql`now()`)
    }, (table) => [
      uniqueIndex("contest_managers_user_contest_unique").on(table.userId, table.contestId),
      index("contest_managers_user_idx").on(table.userId),
      index("contest_managers_contest_idx").on(table.contestId)
    ]);
    insertContestManagerSchema = createInsertSchema(contestManagers).omit({
      id: true,
      createdAt: true
    });
    participants = pgTable("participants", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      authId: varchar("auth_id").unique(),
      // Replit Auth sub claim
      email: varchar("email").unique().notNull(),
      firstName: varchar("first_name"),
      lastName: varchar("last_name"),
      profileImageUrl: varchar("profile_image_url"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertParticipantSchema = createInsertSchema(participants).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    folders = pgTable("folders", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      createdAt: timestamp("created_at").notNull().default(sql`now()`)
    }, (table) => [
      uniqueIndex("folders_operator_name_unique").on(table.operatorId, table.name)
    ]);
    insertFolderSchema = createInsertSchema(folders).omit({
      id: true,
      createdAt: true
    });
    contests = pgTable("contests", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      slug: varchar("slug", { length: 100 }),
      eventDate: timestamp("event_date").notNull(),
      topTeam: text("top_team").notNull(),
      leftTeam: text("left_team").notNull(),
      notes: text("notes"),
      folderId: varchar("folder_id").references(() => folders.id, { onDelete: "set null" }),
      topAxisNumbers: jsonb("top_axis_numbers").notNull().$type(),
      leftAxisNumbers: jsonb("left_axis_numbers").notNull().$type(),
      layerLabels: jsonb("layer_labels").$type(),
      redRowsCount: integer("red_rows_count").notNull().default(2),
      showRedHeaders: boolean("show_red_headers").notNull().default(false),
      headerColorsEnabled: boolean("header_colors_enabled").notNull().default(true),
      layerColors: jsonb("layer_colors").$type(),
      layerColorGroups: jsonb("layer_color_groups").$type(),
      status: contestStatusEnum("status").notNull().default("open"),
      prizes: jsonb("prizes").$type().default(sql`'[]'::jsonb`),
      winners: jsonb("winners").$type().default(sql`'[]'::jsonb`),
      q1Winner: text("q1_winner"),
      q2Winner: text("q2_winner"),
      q3Winner: text("q3_winner"),
      q4Winner: text("q4_winner"),
      webhookUrl: text("webhook_url"),
      createdAt: timestamp("created_at").notNull().default(sql`now()`)
    }, (table) => [
      uniqueIndex("contests_operator_slug_unique").on(table.operatorId, table.slug)
    ]);
    RESERVED_SLUGS = [
      "admin",
      "login",
      "board",
      "my-contests",
      "api",
      "logout",
      "auth",
      "contest",
      "contests",
      "folder",
      "folders"
    ];
    baseContestSchema = createInsertSchema(contests).omit({
      id: true,
      createdAt: true
    }).extend({
      slug: z.union([
        z.string().max(100, "URL slug must be 100 characters or less").regex(/^[a-z0-9-]+$/, "URL slug can only contain lowercase letters, numbers, and hyphens").refine((val) => !RESERVED_SLUGS.includes(val), {
          message: `This URL is reserved. Please choose a different one.`
        }),
        z.literal("").transform(() => void 0),
        z.undefined()
      ]),
      topAxisNumbers: z.array(z.array(z.number().min(0).max(9)).length(10)),
      leftAxisNumbers: z.array(z.array(z.number().min(0).max(9)).length(10)),
      layerLabels: z.array(z.string()).optional(),
      redRowsCount: z.number().min(1).max(6),
      headerColorsEnabled: z.boolean().optional(),
      layerColors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(),
      layerColorGroups: z.array(z.number().min(0)).optional(),
      status: z.enum(["open", "locked"]).optional()
    });
    insertContestSchema = baseContestSchema.refine(
      (data) => data.topAxisNumbers.length === data.redRowsCount,
      { message: "topAxisNumbers length must match redRowsCount" }
    ).refine(
      (data) => data.leftAxisNumbers.length === data.redRowsCount,
      { message: "leftAxisNumbers length must match redRowsCount" }
    );
    updateContestSchema = baseContestSchema.partial();
    squares = pgTable("squares", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contestId: varchar("contest_id").notNull().references(() => contests.id, { onDelete: "cascade" }),
      index: integer("index").notNull(),
      row: integer("row").notNull(),
      col: integer("col").notNull(),
      status: squareStatusEnum("status").notNull().default("available"),
      entryName: text("entry_name"),
      holderName: text("holder_name"),
      holderEmail: text("holder_email"),
      participantId: varchar("participant_id").references(() => participants.id, { onDelete: "set null" })
    });
    insertSquareSchema = createInsertSchema(squares).omit({
      id: true
    }).extend({
      status: z.enum(["available", "taken", "disabled"]).optional(),
      index: z.number().min(1).max(100),
      row: z.number().min(0).max(9),
      col: z.number().min(0).max(9)
    });
    updateSquareSchema = insertSquareSchema.partial().omit({
      contestId: true,
      index: true,
      row: true,
      col: true
    });
    golfPoolStatusEnum = pgEnum("golf_pool_status", ["upcoming", "active", "completed"]);
    golfEntryStatusEnum = pgEnum("golf_entry_status", ["active", "eliminated"]);
    golfPickResultEnum = pgEnum("golf_pick_result", ["pending", "survived", "eliminated"]);
    golfTournaments = pgTable("golf_tournaments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      startDate: timestamp("start_date").notNull(),
      endDate: timestamp("end_date").notNull(),
      season: integer("season").notNull(),
      // e.g., 2025
      weekNumber: integer("week_number"),
      // Week in the survivor pool
      createdAt: timestamp("created_at").notNull().default(sql`now()`)
    });
    insertGolfTournamentSchema = createInsertSchema(golfTournaments).omit({
      id: true,
      createdAt: true
    });
    golfPools = pgTable("golf_pools", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      slug: varchar("slug", { length: 100 }),
      season: integer("season").notNull(),
      // e.g., 2025
      entryFee: text("entry_fee"),
      // Display string like "$50"
      prizePool: text("prize_pool"),
      // Display string like "$500"
      status: golfPoolStatusEnum("status").notNull().default("upcoming"),
      currentWeek: integer("current_week").default(1),
      pickDeadlineHours: integer("pick_deadline_hours").default(0),
      // Hours before tournament start
      showPicksOverride: boolean("show_picks_override").default(false),
      // Admin override to show all picks regardless of deadline
      notes: text("notes"),
      webhookUrl: text("webhook_url"),
      // n8n webhook URL for pick notifications
      createdAt: timestamp("created_at").notNull().default(sql`now()`)
    }, (table) => [
      uniqueIndex("golf_pools_operator_slug_unique").on(table.operatorId, table.slug)
    ]);
    insertGolfPoolSchema = createInsertSchema(golfPools).omit({
      id: true,
      createdAt: true
    }).extend({
      slug: z.union([
        z.string().max(100, "URL slug must be 100 characters or less").regex(/^[a-z0-9-]+$/, "URL slug can only contain lowercase letters, numbers, and hyphens"),
        z.literal("").transform(() => void 0),
        z.undefined()
      ])
    });
    golfPoolEntries = pgTable("golf_pool_entries", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      poolId: varchar("pool_id").notNull().references(() => golfPools.id, { onDelete: "cascade" }),
      participantId: varchar("participant_id").references(() => participants.id, { onDelete: "set null" }),
      entryName: text("entry_name").notNull(),
      // Display name for this entry
      email: text("email").notNull(),
      manageToken: varchar("manage_token").default(sql`gen_random_uuid()`),
      // Unique token for entry management access
      status: golfEntryStatusEnum("status").notNull().default("active"),
      eliminatedWeek: integer("eliminated_week"),
      // Week when eliminated
      usedGolfers: jsonb("used_golfers").$type().default(sql`'[]'::jsonb`),
      // List of golfer names already used
      createdAt: timestamp("created_at").notNull().default(sql`now()`)
    }, (table) => [
      index("golf_pool_entries_pool_idx").on(table.poolId),
      index("golf_pool_entries_email_idx").on(table.email),
      index("golf_pool_entries_token_idx").on(table.manageToken)
    ]);
    insertGolfPoolEntrySchema = createInsertSchema(golfPoolEntries).omit({
      id: true,
      createdAt: true,
      eliminatedWeek: true,
      usedGolfers: true,
      manageToken: true
    });
    golfPicks = pgTable("golf_picks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      entryId: varchar("entry_id").notNull().references(() => golfPoolEntries.id, { onDelete: "cascade" }),
      poolId: varchar("pool_id").notNull().references(() => golfPools.id, { onDelete: "cascade" }),
      tournamentId: varchar("tournament_id").references(() => golfTournaments.id, { onDelete: "set null" }),
      tournamentName: text("tournament_name"),
      // Store tournament name for display (from DataGolf or manual entry)
      weekNumber: integer("week_number").notNull(),
      golferName: text("golfer_name").notNull(),
      // Name of the golfer picked
      isAutoPick: boolean("is_auto_pick").notNull().default(false),
      // True if system auto-picked
      result: golfPickResultEnum("result").notNull().default("pending"),
      createdAt: timestamp("created_at").notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
    }, (table) => [
      index("golf_picks_entry_idx").on(table.entryId),
      index("golf_picks_pool_week_idx").on(table.poolId, table.weekNumber),
      uniqueIndex("golf_picks_entry_week_unique").on(table.entryId, table.weekNumber)
    ]);
    insertGolfPickSchema = createInsertSchema(golfPicks).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      result: true
    });
    golfPickHistory = pgTable("golf_pick_history", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      pickId: varchar("pick_id").notNull().references(() => golfPicks.id, { onDelete: "cascade" }),
      entryId: varchar("entry_id").notNull().references(() => golfPoolEntries.id, { onDelete: "cascade" }),
      poolId: varchar("pool_id").notNull().references(() => golfPools.id, { onDelete: "cascade" }),
      weekNumber: integer("week_number").notNull(),
      golferName: text("golfer_name").notNull(),
      // The golfer that was originally picked
      tournamentName: text("tournament_name"),
      changedAt: timestamp("changed_at").notNull().default(sql`now()`),
      // When the pick was changed
      changedBy: text("changed_by"),
      // Who changed it: "user", "admin", "system"
      reason: text("reason")
      // Optional reason for the change
    }, (table) => [
      index("golf_pick_history_pick_idx").on(table.pickId),
      index("golf_pick_history_entry_idx").on(table.entryId),
      index("golf_pick_history_pool_week_idx").on(table.poolId, table.weekNumber)
    ]);
    insertGolfPickHistorySchema = createInsertSchema(golfPickHistory).omit({
      id: true,
      changedAt: true
    });
    squareTemplates = pgTable("square_templates", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      squares: jsonb("squares").$type().notNull(),
      createdAt: timestamp("created_at").notNull().default(sql`now()`)
    }, (table) => [
      index("square_templates_operator_idx").on(table.operatorId)
    ]);
    insertSquareTemplateSchema = createInsertSchema(squareTemplates).omit({
      id: true,
      createdAt: true
    }).extend({
      squares: z.array(z.object({
        index: z.number().min(1).max(100),
        entryName: z.string(),
        holderName: z.string(),
        holderEmail: z.string().email()
      }))
    });
    earningsPoolStatusEnum = pgEnum("earnings_pool_status", ["setup", "open", "locked", "live", "completed"]);
    earningsPools = pgTable("earnings_pools", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      operatorId: varchar("operator_id").references(() => operators.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      slug: varchar("slug", { length: 100 }),
      tournamentName: text("tournament_name").notNull(),
      tournamentDgId: varchar("tournament_dg_id"),
      // DataGolf event ID
      season: integer("season").notNull(),
      entryFee: text("entry_fee"),
      maxEntriesPerEmail: integer("max_entries_per_email").notNull().default(1),
      status: earningsPoolStatusEnum("status").notNull().default("setup"),
      notes: text("notes"),
      // Prize purse data (from DataGolf or manual)
      purseTotalCents: integer("purse_total_cents"),
      // Total tournament purse in cents
      payoutStructure: jsonb("payout_structure").$type(),
      // Summary cache - pre-calculated rankings for fast reads
      rankingsCache: jsonb("rankings_cache").$type(),
      rankingsCacheUpdatedAt: timestamp("rankings_cache_updated_at"),
      createdAt: timestamp("created_at").notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
    }, (table) => [
      uniqueIndex("earnings_pools_operator_slug_unique").on(table.operatorId, table.slug)
    ]);
    insertEarningsPoolSchema = createInsertSchema(earningsPools).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      rankingsCache: true,
      rankingsCacheUpdatedAt: true
    }).extend({
      slug: z.union([
        z.string().max(100, "URL slug must be 100 characters or less").regex(/^[a-z0-9-]+$/, "URL slug can only contain lowercase letters, numbers, and hyphens"),
        z.literal("").transform(() => void 0),
        z.undefined()
      ])
    });
    earningsPoolGolfers = pgTable("earnings_pool_golfers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      poolId: varchar("pool_id").notNull().references(() => earningsPools.id, { onDelete: "cascade" }),
      dgId: integer("dg_id").notNull(),
      // DataGolf player ID
      name: text("name").notNull(),
      country: text("country"),
      tier: integer("tier").notNull(),
      // 1, 2, 3, or 4
      dgRank: integer("dg_rank"),
      owgrRank: integer("owgr_rank"),
      currentPosition: text("current_position"),
      // Live tournament position
      currentEarningsCents: integer("current_earnings_cents").notNull().default(0),
      status: text("status").notNull().default("active"),
      // active, cut, wd, dq
      createdAt: timestamp("created_at").notNull().default(sql`now()`)
    }, (table) => [
      index("earnings_pool_golfers_pool_idx").on(table.poolId),
      uniqueIndex("earnings_pool_golfers_pool_dg_unique").on(table.poolId, table.dgId),
      index("earnings_pool_golfers_tier_idx").on(table.poolId, table.tier)
    ]);
    insertEarningsPoolGolferSchema = createInsertSchema(earningsPoolGolfers).omit({
      id: true,
      createdAt: true,
      currentPosition: true,
      currentEarningsCents: true,
      status: true
    });
    earningsPoolEntries = pgTable("earnings_pool_entries", {
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
      createdAt: timestamp("created_at").notNull().default(sql`now()`)
    }, (table) => [
      index("earnings_pool_entries_pool_idx").on(table.poolId),
      index("earnings_pool_entries_email_idx").on(table.email),
      index("earnings_pool_entries_rank_idx").on(table.poolId, table.currentRank)
    ]);
    insertEarningsPoolEntrySchema = createInsertSchema(earningsPoolEntries).omit({
      id: true,
      createdAt: true,
      totalEarningsCents: true,
      currentRank: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/datagolf.ts
var DATAGOLF_BASE_URL, DataGolfService, dataGolfService;
var init_datagolf = __esm({
  "server/datagolf.ts"() {
    "use strict";
    DATAGOLF_BASE_URL = "https://feeds.datagolf.com";
    DataGolfService = class {
      apiKey;
      rankingsCache = /* @__PURE__ */ new Map();
      fieldCache = /* @__PURE__ */ new Map();
      inPlayCache = /* @__PURE__ */ new Map();
      CACHE_TTL = 1e3 * 60 * 15;
      // 15 minutes
      IN_PLAY_CACHE_TTL = 1e3 * 60 * 5;
      // 5 minutes for live data
      constructor() {
        this.apiKey = process.env.DATAGOLF_API_KEY || "";
        if (!this.apiKey) {
          console.warn("DATAGOLF_API_KEY not set - DataGolf features will not work");
        }
      }
      async fetchRankings() {
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
          const data = await response.json();
          this.rankingsCache.set(cacheKey, { data: data.rankings, timestamp: Date.now() });
          return data.rankings;
        } catch (error) {
          console.error("Error fetching DataGolf rankings:", error);
          const cached2 = this.rankingsCache.get(cacheKey);
          if (cached2) {
            return cached2.data;
          }
          throw error;
        }
      }
      async fetchField(tour = "pga") {
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
          const data = await response.json();
          this.fieldCache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        } catch (error) {
          console.error("Error fetching DataGolf field:", error);
          const cached2 = this.fieldCache.get(cacheKey);
          if (cached2) {
            return cached2.data;
          }
          throw error;
        }
      }
      async getRankings() {
        const rankings = await this.fetchRankings();
        return rankings.map((r) => ({
          dgId: r.dg_id,
          name: r.player_name,
          country: r.country,
          dgRank: r.datagolf_rank,
          owgrRank: r.owgr_rank,
          skillEstimate: r.dg_skill_estimate,
          inField: false
        }));
      }
      async getCurrentField(tour = "pga") {
        const [fieldData, rankings] = await Promise.all([
          this.fetchField(tour),
          this.fetchRankings()
        ]);
        const rankingsMap = /* @__PURE__ */ new Map();
        rankings.forEach((r) => rankingsMap.set(r.dg_id, r));
        const golfers = fieldData.field.map((player) => {
          const ranking = rankingsMap.get(player.dg_id);
          return {
            dgId: player.dg_id,
            name: player.player_name,
            country: player.country,
            dgRank: ranking?.datagolf_rank ?? null,
            owgrRank: ranking?.owgr_rank ?? null,
            skillEstimate: ranking?.dg_skill_estimate ?? null,
            inField: true
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
          golfers
        };
      }
      async searchGolfers(query) {
        const rankings = await this.getRankings();
        const lowerQuery = query.toLowerCase();
        return rankings.filter(
          (g) => g.name.toLowerCase().includes(lowerQuery)
        ).slice(0, 50);
      }
      async fetchInPlay(tour = "pga") {
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
              return null;
            }
            throw new Error(`DataGolf API error: ${response.status}`);
          }
          const data = await response.json();
          this.inPlayCache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        } catch (error) {
          console.error("Error fetching DataGolf in-play data:", error);
          const cached2 = this.inPlayCache.get(cacheKey);
          if (cached2) {
            return cached2.data;
          }
          return null;
        }
      }
      async getLiveTournamentData(tour = "pga") {
        const inPlayData = await this.fetchInPlay(tour);
        if (!inPlayData) {
          return null;
        }
        const rawPlayers = inPlayData.players || inPlayData.data || [];
        if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
          console.warn("DataGolf in-play response has no players data:", Object.keys(inPlayData));
          return null;
        }
        console.log("DataGolf in-play: Sample players (first 5):", rawPlayers.slice(0, 5).map((p) => ({
          name: p.player_name,
          current_pos: p.current_pos,
          status: p.status
        })));
        const cutPlayers = rawPlayers.filter((p) => {
          const pos = (p.current_pos || "").toUpperCase();
          const stat = (p.status || "").toUpperCase();
          return pos.includes("CUT") || pos.includes("WD") || pos.includes("DQ") || stat.includes("CUT") || stat.includes("WD") || stat.includes("DQ");
        });
        console.log(`DataGolf in-play: Found ${cutPlayers.length} cut/wd/dq players:`, cutPlayers.slice(0, 5).map((p) => ({
          name: p.player_name,
          current_pos: p.current_pos,
          status: p.status
        })));
        const players = rawPlayers.map((player) => {
          let status = "active";
          const statusField = (player.status || "").toUpperCase();
          const posField = (player.current_pos || "").toUpperCase();
          if (statusField === "CUT" || statusField === "MC" || posField === "CUT" || posField === "MC") {
            status = "cut";
          } else if (statusField === "WD" || posField === "WD") {
            status = "wd";
          } else if (statusField === "DQ" || posField === "DQ") {
            status = "dq";
          }
          return {
            dgId: player.dg_id,
            name: player.player_name,
            country: player.country,
            position: player.current_pos,
            score: player.current_score,
            thru: player.thru?.toString(),
            round: player.round,
            status
          };
        });
        const info = inPlayData.info || {};
        const eventName = inPlayData.event_name || info.event_name || "Unknown Tournament";
        const currentRound = inPlayData.current_round ?? info.current_round ?? 0;
        const cutLine = inPlayData.cut_line ?? info.cut_line;
        const lastUpdated = inPlayData.last_updated || info.last_updated || (/* @__PURE__ */ new Date()).toISOString();
        return {
          eventName,
          currentRound,
          cutLine,
          lastUpdated,
          players
        };
      }
      async getPlayerCutStatus(golferName, tour = "pga") {
        const liveData = await this.getLiveTournamentData(tour);
        if (!liveData) {
          return "unknown";
        }
        const normalizedQuery = golferName.toLowerCase().trim();
        const player = liveData.players.find((p) => {
          const normalizedName = p.name.toLowerCase().trim();
          if (normalizedName === normalizedQuery) return true;
          const queryParts = normalizedQuery.split(",").map((s) => s.trim());
          const nameParts = normalizedName.split(",").map((s) => s.trim());
          if (queryParts.length === 2 && nameParts.length === 2) {
            return queryParts[0] === nameParts[0] && (queryParts[1].startsWith(nameParts[1].charAt(0)) || nameParts[1].startsWith(queryParts[1].charAt(0)));
          }
          return false;
        });
        if (player) {
          return player.status;
        }
        if (liveData.currentRound >= 3) {
          return "cut";
        }
        return "unknown";
      }
      isConfigured() {
        return !!this.apiKey;
      }
    };
    dataGolfService = new DataGolfService();
  }
});

// server/earningsEngine.ts
var earningsEngine_exports = {};
__export(earningsEngine_exports, {
  assignTiers: () => assignTiers,
  refreshEarningsPool: () => refreshEarningsPool,
  startScoringLoop: () => startScoringLoop,
  stopScoringLoop: () => stopScoringLoop
});
import { eq as eq2 } from "drizzle-orm";
function parsePosition(pos) {
  if (!pos) return null;
  const cleaned = pos.replace(/^T/, "").trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}
function calculateEarningsFromPosition(position, purseTotalCents, payoutStructure, allPositions) {
  const numPos = parsePosition(position);
  if (numPos === null || numPos < 1) return 0;
  const tiedCount = allPositions.filter((p) => parsePosition(p) === numPos).length;
  if (tiedCount === 0) return 0;
  let totalPercentage = 0;
  for (let i = 0; i < tiedCount; i++) {
    const posIndex = numPos + i;
    const payout = payoutStructure.find((p) => p.position === posIndex);
    if (payout) {
      totalPercentage += payout.percentage;
    }
  }
  const perPlayerPercentage = totalPercentage / tiedCount;
  return Math.round(purseTotalCents * perPlayerPercentage / 100);
}
async function refreshEarningsPool(poolId) {
  const pool2 = await db.select().from(earningsPools).where(eq2(earningsPools.id, poolId)).limit(1);
  if (!pool2[0]) throw new Error("Pool not found");
  const poolData = pool2[0];
  const golfers = await db.select().from(earningsPoolGolfers).where(eq2(earningsPoolGolfers.poolId, poolId));
  const liveData = await dataGolfService.getLiveTournamentData("pga");
  const payoutStructure = poolData.payoutStructure || DEFAULT_PAYOUT_PERCENTAGES;
  const purseTotalCents = poolData.purseTotalCents || 0;
  if (liveData && liveData.players.length > 0) {
    const allPositions = liveData.players.map((p) => p.position);
    for (const golfer of golfers) {
      const livePlayer = liveData.players.find((p) => p.dgId === golfer.dgId);
      if (livePlayer) {
        const earnings = calculateEarningsFromPosition(
          livePlayer.position,
          purseTotalCents,
          payoutStructure,
          allPositions
        );
        await db.update(earningsPoolGolfers).set({
          currentPosition: livePlayer.position || null,
          currentEarningsCents: earnings,
          status: livePlayer.status
        }).where(eq2(earningsPoolGolfers.id, golfer.id));
      }
    }
  }
  const updatedGolfers = await db.select().from(earningsPoolGolfers).where(eq2(earningsPoolGolfers.poolId, poolId));
  const golferMap = new Map(updatedGolfers.map((g) => [g.id, g]));
  const entries = await db.select().from(earningsPoolEntries).where(eq2(earningsPoolEntries.poolId, poolId));
  const rankedEntries = entries.map((entry) => {
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
      status: g?.status || "unknown"
    }));
    const totalEarnings = golferDetails.reduce((sum, g) => sum + g.earnings, 0);
    return {
      entryId: entry.id,
      entryName: entry.entryName,
      email: entry.email,
      rank: 0,
      // will be set after sorting
      totalEarnings,
      golfers: golferDetails
    };
  });
  rankedEntries.sort((a, b) => b.totalEarnings - a.totalEarnings);
  let currentRank = 1;
  for (let i = 0; i < rankedEntries.length; i++) {
    if (i > 0 && rankedEntries[i].totalEarnings < rankedEntries[i - 1].totalEarnings) {
      currentRank = i + 1;
    }
    rankedEntries[i].rank = currentRank;
  }
  for (const entry of rankedEntries) {
    await db.update(earningsPoolEntries).set({
      totalEarningsCents: entry.totalEarnings,
      currentRank: entry.rank
    }).where(eq2(earningsPoolEntries.id, entry.entryId));
  }
  await db.update(earningsPools).set({
    rankingsCache: rankedEntries,
    rankingsCacheUpdatedAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq2(earningsPools.id, poolId));
  return rankedEntries;
}
function assignTiers(golferCount, index2) {
  const quarterSize = Math.ceil(golferCount / 4);
  if (index2 < quarterSize) return 1;
  if (index2 < quarterSize * 2) return 2;
  if (index2 < quarterSize * 3) return 3;
  return 4;
}
function startScoringLoop(poolId, intervalMs = 5 * 60 * 1e3) {
  if (scoringIntervals.has(poolId)) return;
  console.log(`[EarningsEngine] Starting scoring loop for pool ${poolId} (every ${intervalMs / 1e3}s)`);
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
function stopScoringLoop(poolId) {
  const interval = scoringIntervals.get(poolId);
  if (interval) {
    clearInterval(interval);
    scoringIntervals.delete(poolId);
    console.log(`[EarningsEngine] Stopped scoring loop for pool ${poolId}`);
  }
}
var DEFAULT_PAYOUT_PERCENTAGES, scoringIntervals;
var init_earningsEngine = __esm({
  "server/earningsEngine.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_datagolf();
    DEFAULT_PAYOUT_PERCENTAGES = [
      { position: 1, percentage: 18 },
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
      { position: 65, percentage: 0.124 }
    ];
    scoringIntervals = /* @__PURE__ */ new Map();
  }
});

// server/vercel/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
init_schema();
init_db();
import { eq, and, asc, desc } from "drizzle-orm";
var DbStorage = class {
  // Operator methods
  async getOperator(id) {
    const result = await db.select().from(operators).where(eq(operators.id, id)).limit(1);
    return result[0];
  }
  async getOperatorBySlug(slug) {
    const result = await db.select().from(operators).where(eq(operators.slug, slug)).limit(1);
    return result[0];
  }
  async createOperator(operator) {
    const result = await db.insert(operators).values(operator).returning();
    return result[0];
  }
  async updateOperator(id, operator) {
    const result = await db.update(operators).set({
      ...operator,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(operators.id, id)).returning();
    return result[0];
  }
  // User methods for Replit Auth
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }
  async getUsersByOperator(operatorId) {
    return db.select().from(users).where(eq(users.operatorId, operatorId));
  }
  async upsertUser(userData) {
    const result = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        ...userData.role !== void 0 && { role: userData.role },
        ...userData.isAdmin !== void 0 && { isAdmin: userData.isAdmin },
        ...userData.operatorId !== void 0 && { operatorId: userData.operatorId },
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return result[0];
  }
  async updateUserRole(userId, role) {
    const isAdmin2 = role === "admin" || role === "super_admin";
    const result = await db.update(users).set({
      role,
      isAdmin: isAdmin2,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId)).returning();
    return result[0];
  }
  // Contest Manager methods
  async getContestManagers(contestId) {
    return db.select().from(contestManagers).where(eq(contestManagers.contestId, contestId));
  }
  async getContestsForManager(userId) {
    return db.select().from(contestManagers).where(eq(contestManagers.userId, userId));
  }
  async addContestManager(manager) {
    const result = await db.insert(contestManagers).values(manager).returning();
    return result[0];
  }
  async removeContestManager(userId, contestId) {
    await db.delete(contestManagers).where(
      and(eq(contestManagers.userId, userId), eq(contestManagers.contestId, contestId))
    );
  }
  async isContestManager(userId, contestId) {
    const result = await db.select().from(contestManagers).where(
      and(eq(contestManagers.userId, userId), eq(contestManagers.contestId, contestId))
    ).limit(1);
    return result.length > 0;
  }
  // Participant methods (master accounts for pool participants)
  async getParticipant(id) {
    const result = await db.select().from(participants).where(eq(participants.id, id)).limit(1);
    return result[0];
  }
  async getParticipantByAuthId(authId) {
    const result = await db.select().from(participants).where(eq(participants.authId, authId)).limit(1);
    return result[0];
  }
  async getParticipantByEmail(email) {
    const result = await db.select().from(participants).where(eq(participants.email, email)).limit(1);
    return result[0];
  }
  async upsertParticipant(participantData) {
    if (participantData.authId) {
      const existing = await this.getParticipantByAuthId(participantData.authId);
      if (existing) {
        const result2 = await db.update(participants).set({
          ...participantData,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(participants.id, existing.id)).returning();
        return result2[0];
      }
    }
    const existingByEmail = await this.getParticipantByEmail(participantData.email);
    if (existingByEmail) {
      const result2 = await db.update(participants).set({
        ...participantData,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(participants.id, existingByEmail.id)).returning();
      return result2[0];
    }
    const result = await db.insert(participants).values(participantData).returning();
    return result[0];
  }
  async getParticipantContests(participantId) {
    const participantSquares = await db.select().from(squares).where(eq(squares.participantId, participantId));
    const contestIds = Array.from(new Set(participantSquares.map((s) => s.contestId)));
    const result = [];
    for (const contestId of contestIds) {
      const contest = await this.getContest(contestId);
      if (contest) {
        const contestSquares = participantSquares.filter((s) => s.contestId === contestId);
        result.push({ contest, squares: contestSquares });
      }
    }
    return result;
  }
  // Folder methods (operator-scoped)
  async getAllFolders(operatorId) {
    return await db.select().from(folders).where(eq(folders.operatorId, operatorId));
  }
  async getFolder(id) {
    const result = await db.select().from(folders).where(eq(folders.id, id)).limit(1);
    return result[0];
  }
  async createFolder(folder) {
    const result = await db.insert(folders).values(folder).returning();
    return result[0];
  }
  async deleteFolder(id) {
    await db.delete(folders).where(eq(folders.id, id));
  }
  // Contest methods (operator-scoped)
  async getContest(id) {
    const result = await db.select().from(contests).where(eq(contests.id, id)).limit(1);
    return result[0];
  }
  async getContestBySlug(slug, operatorId) {
    if (operatorId) {
      const result2 = await db.select().from(contests).where(and(eq(contests.slug, slug), eq(contests.operatorId, operatorId))).limit(1);
      return result2[0];
    }
    const result = await db.select().from(contests).where(eq(contests.slug, slug)).limit(1);
    return result[0];
  }
  async getAllContests(operatorId) {
    return await db.select().from(contests).where(eq(contests.operatorId, operatorId));
  }
  async getAllContestsGlobal() {
    return await db.select().from(contests);
  }
  async createContest(contest) {
    const result = await db.insert(contests).values(contest).returning();
    return result[0];
  }
  async updateContest(id, contest) {
    const result = await db.update(contests).set(contest).where(eq(contests.id, id)).returning();
    return result[0];
  }
  async deleteContest(id) {
    await db.delete(contests).where(eq(contests.id, id));
  }
  async countContestsByOperator(operatorId) {
    const result = await db.select().from(contests).where(eq(contests.operatorId, operatorId));
    return result.length;
  }
  // Square methods
  async getContestSquares(contestId) {
    return await db.select().from(squares).where(eq(squares.contestId, contestId));
  }
  async getSquare(id) {
    const result = await db.select().from(squares).where(eq(squares.id, id)).limit(1);
    return result[0];
  }
  async createSquare(square) {
    const result = await db.insert(squares).values(square).returning();
    return result[0];
  }
  async updateSquare(id, square) {
    const result = await db.update(squares).set(square).where(eq(squares.id, id)).returning();
    return result[0];
  }
  async createSquares(squaresToCreate) {
    const result = await db.insert(squares).values(squaresToCreate).returning();
    return result;
  }
  async updateSquareByContestAndIndex(contestId, index2, square) {
    const result = await db.update(squares).set(square).where(and(eq(squares.contestId, contestId), eq(squares.index, index2))).returning();
    return result[0];
  }
  // Golf Tournament methods
  async getAllGolfTournaments(season) {
    if (season) {
      return await db.select().from(golfTournaments).where(eq(golfTournaments.season, season)).orderBy(asc(golfTournaments.startDate));
    }
    return await db.select().from(golfTournaments).orderBy(asc(golfTournaments.startDate));
  }
  async getGolfTournament(id) {
    const result = await db.select().from(golfTournaments).where(eq(golfTournaments.id, id)).limit(1);
    return result[0];
  }
  async createGolfTournament(tournament) {
    const result = await db.insert(golfTournaments).values(tournament).returning();
    return result[0];
  }
  async updateGolfTournament(id, tournament) {
    const result = await db.update(golfTournaments).set(tournament).where(eq(golfTournaments.id, id)).returning();
    return result[0];
  }
  async deleteGolfTournament(id) {
    await db.delete(golfTournaments).where(eq(golfTournaments.id, id));
  }
  // Golf Pool methods
  async getAllGolfPools(operatorId) {
    return await db.select().from(golfPools).where(eq(golfPools.operatorId, operatorId));
  }
  async getGolfPool(id) {
    const result = await db.select().from(golfPools).where(eq(golfPools.id, id)).limit(1);
    return result[0];
  }
  async getGolfPoolBySlug(slug, operatorId) {
    if (operatorId) {
      const result2 = await db.select().from(golfPools).where(and(eq(golfPools.slug, slug), eq(golfPools.operatorId, operatorId))).limit(1);
      return result2[0];
    }
    const result = await db.select().from(golfPools).where(eq(golfPools.slug, slug)).limit(1);
    return result[0];
  }
  async createGolfPool(pool2) {
    const result = await db.insert(golfPools).values(pool2).returning();
    return result[0];
  }
  async updateGolfPool(id, pool2) {
    const result = await db.update(golfPools).set(pool2).where(eq(golfPools.id, id)).returning();
    return result[0];
  }
  async deleteGolfPool(id) {
    await db.delete(golfPools).where(eq(golfPools.id, id));
  }
  // Golf Pool Entry methods
  async getGolfPoolEntries(poolId) {
    return await db.select().from(golfPoolEntries).where(eq(golfPoolEntries.poolId, poolId));
  }
  async getGolfPoolEntry(id) {
    const result = await db.select().from(golfPoolEntries).where(eq(golfPoolEntries.id, id)).limit(1);
    return result[0];
  }
  async getGolfPoolEntryByToken(token) {
    const result = await db.select().from(golfPoolEntries).where(eq(golfPoolEntries.manageToken, token)).limit(1);
    return result[0];
  }
  async getGolfPoolEntriesByEmail(email) {
    return await db.select().from(golfPoolEntries).where(eq(golfPoolEntries.email, email));
  }
  async getGolfPoolEntriesByPoolAndEmail(poolId, email) {
    return await db.select().from(golfPoolEntries).where(and(eq(golfPoolEntries.poolId, poolId), eq(golfPoolEntries.email, email)));
  }
  async createGolfPoolEntry(entry) {
    const result = await db.insert(golfPoolEntries).values(entry).returning();
    return result[0];
  }
  async updateGolfPoolEntry(id, entry) {
    const result = await db.update(golfPoolEntries).set(entry).where(eq(golfPoolEntries.id, id)).returning();
    return result[0];
  }
  async deleteGolfPoolEntry(id) {
    await db.delete(golfPicks).where(eq(golfPicks.entryId, id));
    await db.delete(golfPoolEntries).where(eq(golfPoolEntries.id, id));
  }
  // Golf Pick methods
  async getGolfPick(id) {
    const result = await db.select().from(golfPicks).where(eq(golfPicks.id, id)).limit(1);
    return result[0];
  }
  async getGolfPicks(entryId) {
    return await db.select().from(golfPicks).where(eq(golfPicks.entryId, entryId)).orderBy(asc(golfPicks.weekNumber));
  }
  async getGolfPicksForWeek(poolId, weekNumber) {
    return await db.select().from(golfPicks).where(and(eq(golfPicks.poolId, poolId), eq(golfPicks.weekNumber, weekNumber)));
  }
  async createGolfPick(pick) {
    const result = await db.insert(golfPicks).values(pick).returning();
    return result[0];
  }
  async updateGolfPick(id, pick) {
    const result = await db.update(golfPicks).set(pick).where(eq(golfPicks.id, id)).returning();
    return result[0];
  }
  // Golf Pick History methods
  async getGolfPickHistory(pickId) {
    return await db.select().from(golfPickHistory).where(eq(golfPickHistory.pickId, pickId)).orderBy(desc(golfPickHistory.changedAt));
  }
  async getGolfPickHistoryForEntry(entryId) {
    return await db.select().from(golfPickHistory).where(eq(golfPickHistory.entryId, entryId)).orderBy(desc(golfPickHistory.changedAt));
  }
  async createGolfPickHistory(history) {
    const result = await db.insert(golfPickHistory).values(history).returning();
    return result[0];
  }
  // Square Template methods
  async getAllSquareTemplates(operatorId) {
    return await db.select().from(squareTemplates).where(eq(squareTemplates.operatorId, operatorId)).orderBy(asc(squareTemplates.name));
  }
  async getSquareTemplate(id) {
    const result = await db.select().from(squareTemplates).where(eq(squareTemplates.id, id)).limit(1);
    return result[0];
  }
  async createSquareTemplate(template) {
    const result = await db.insert(squareTemplates).values(template).returning();
    return result[0];
  }
  async deleteSquareTemplate(id) {
    await db.delete(squareTemplates).where(eq(squareTemplates.id, id));
  }
  // ==========================================
  // Earnings Pool methods
  // ==========================================
  async getAllEarningsPools(operatorId) {
    return await db.select().from(earningsPools).where(eq(earningsPools.operatorId, operatorId)).orderBy(desc(earningsPools.createdAt));
  }
  async listEarningsPools() {
    return await db.select().from(earningsPools).orderBy(desc(earningsPools.createdAt));
  }
  async getEarningsPool(id) {
    const result = await db.select().from(earningsPools).where(eq(earningsPools.id, id)).limit(1);
    return result[0];
  }
  async getEarningsPoolBySlug(slug, operatorId) {
    if (operatorId) {
      const result2 = await db.select().from(earningsPools).where(and(eq(earningsPools.slug, slug), eq(earningsPools.operatorId, operatorId))).limit(1);
      return result2[0];
    }
    const result = await db.select().from(earningsPools).where(eq(earningsPools.slug, slug)).limit(1);
    return result[0];
  }
  async createEarningsPool(pool2) {
    const result = await db.insert(earningsPools).values(pool2).returning();
    return result[0];
  }
  async updateEarningsPool(id, pool2) {
    const result = await db.update(earningsPools).set({ ...pool2, updatedAt: /* @__PURE__ */ new Date() }).where(eq(earningsPools.id, id)).returning();
    return result[0];
  }
  async deleteEarningsPool(id) {
    await db.delete(earningsPools).where(eq(earningsPools.id, id));
  }
  // Earnings Pool Golfer methods
  async getEarningsPoolGolfers(poolId) {
    return await db.select().from(earningsPoolGolfers).where(eq(earningsPoolGolfers.poolId, poolId)).orderBy(asc(earningsPoolGolfers.tier), asc(earningsPoolGolfers.dgRank));
  }
  async getEarningsPoolGolfersByTier(poolId, tier) {
    return await db.select().from(earningsPoolGolfers).where(and(eq(earningsPoolGolfers.poolId, poolId), eq(earningsPoolGolfers.tier, tier))).orderBy(asc(earningsPoolGolfers.dgRank));
  }
  async createEarningsPoolGolfer(golfer) {
    const result = await db.insert(earningsPoolGolfers).values(golfer).returning();
    return result[0];
  }
  async createEarningsPoolGolfers(golfersList) {
    if (golfersList.length === 0) return [];
    const result = await db.insert(earningsPoolGolfers).values(golfersList).returning();
    return result;
  }
  async deleteEarningsPoolGolfers(poolId) {
    await db.delete(earningsPoolGolfers).where(eq(earningsPoolGolfers.poolId, poolId));
  }
  // Earnings Pool Entry methods
  async getEarningsPoolEntries(poolId) {
    return await db.select().from(earningsPoolEntries).where(eq(earningsPoolEntries.poolId, poolId)).orderBy(asc(earningsPoolEntries.currentRank));
  }
  async getEarningsPoolEntry(id) {
    const result = await db.select().from(earningsPoolEntries).where(eq(earningsPoolEntries.id, id)).limit(1);
    return result[0];
  }
  async getEarningsPoolEntriesByEmail(poolId, email) {
    return await db.select().from(earningsPoolEntries).where(and(eq(earningsPoolEntries.poolId, poolId), eq(earningsPoolEntries.email, email)));
  }
  async createEarningsPoolEntry(entry) {
    const result = await db.insert(earningsPoolEntries).values(entry).returning();
    return result[0];
  }
  async deleteEarningsPoolEntry(id) {
    await db.delete(earningsPoolEntries).where(eq(earningsPoolEntries.id, id));
  }
  async countEarningsPoolEntries(poolId) {
    const entries = await db.select().from(earningsPoolEntries).where(eq(earningsPoolEntries.poolId, poolId));
    return entries.length;
  }
};
var storage = new DbStorage();

// server/routes.ts
init_schema();
import { z as z2 } from "zod";

// server/webhook.ts
async function sendGolfPickWebhookNotification(webhookUrl, data) {
  if (!webhookUrl) {
    console.log("\u26A0\uFE0F  Golf webhook URL not configured, skipping notification");
    return;
  }
  console.log(`\u{1F3CC}\uFE0F Sending golf pick notification for ${data.golferName} to ${webhookUrl}`);
  try {
    const payload = {
      event: "golf_pick_submitted",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data,
      // Flattened fields for n8n compatibility
      to: data.recipientEmail,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: `Golf Pick Confirmed - Week ${data.weekNumber}: ${data.golferName}`,
      poolName: data.poolName,
      poolId: data.poolId,
      entryName: data.entryName,
      golferName: data.golferName,
      tournamentName: data.tournamentName,
      weekNumber: data.weekNumber
    };
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`\u274C Golf webhook notification failed: ${response.status} ${response.statusText}`);
      console.error(`   Response body: ${errorText}`);
    } else {
      console.log(`\u2705 Golf pick notification sent successfully for ${data.golferName}`);
    }
  } catch (error) {
    console.error("\u274C Failed to send golf webhook notification:", error);
    console.error(`   Webhook URL: ${webhookUrl}`);
    console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
  }
}
async function sendGolfSignupWebhookNotification(webhookUrl, data) {
  if (!webhookUrl) {
    console.log("\u26A0\uFE0F  Golf webhook URL not configured, skipping signup notification");
    return;
  }
  console.log(`\u{1F3CC}\uFE0F Sending golf signup notification for ${data.recipientName} to ${webhookUrl}`);
  try {
    const payload = {
      event: "golf_user_signup",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data,
      to: data.recipientEmail,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: `Welcome to ${data.poolName}!`,
      poolName: data.poolName,
      poolId: data.poolId
    };
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`\u274C Golf signup webhook failed: ${response.status} ${response.statusText}`);
      console.error(`   Response body: ${errorText}`);
    } else {
      console.log(`\u2705 Golf signup notification sent successfully for ${data.recipientName}`);
    }
  } catch (error) {
    console.error("\u274C Failed to send golf signup webhook notification:", error);
    console.error(`   Webhook URL: ${webhookUrl}`);
    console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
  }
}
async function sendGolfEntryWebhookNotification(webhookUrl, data) {
  if (!webhookUrl) {
    console.log("\u26A0\uFE0F  Golf webhook URL not configured, skipping entry notification");
    return;
  }
  console.log(`\u{1F3CC}\uFE0F Sending golf entry notification for ${data.entryName} to ${webhookUrl}`);
  try {
    const payload = {
      event: "golf_entry_created",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data,
      to: data.recipientEmail,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: `Entry Created - ${data.entryName} in ${data.poolName}`,
      poolName: data.poolName,
      poolId: data.poolId,
      entryName: data.entryName,
      entryNumber: data.entryNumber
    };
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`\u274C Golf entry webhook failed: ${response.status} ${response.statusText}`);
      console.error(`   Response body: ${errorText}`);
    } else {
      console.log(`\u2705 Golf entry notification sent successfully for ${data.entryName}`);
    }
  } catch (error) {
    console.error("\u274C Failed to send golf entry webhook notification:", error);
    console.error(`   Webhook URL: ${webhookUrl}`);
    console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
  }
}
async function sendWebhookNotification(webhookUrl, data) {
  if (!webhookUrl) {
    console.log("\u26A0\uFE0F  Webhook URL not configured, skipping notification");
    return;
  }
  console.log(`\u{1F4E7} Sending webhook notification for square #${data.squareNumber} to ${webhookUrl}`);
  try {
    const payload = {
      event: "square_claimed",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      // Include both nested data and flattened fields for n8n compatibility
      data,
      // Gmail-friendly fields at root level
      to: data.holderEmail,
      recipientEmail: data.holderEmail,
      recipientName: data.holderName,
      subject: `Square #${data.squareNumber} Claimed - ${data.contestName}`,
      contestName: data.contestName,
      contestId: data.contestId,
      entryName: data.entryName,
      squareNumber: data.squareNumber,
      topTeam: data.topTeam,
      leftTeam: data.leftTeam,
      eventDate: data.eventDate
    };
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`\u274C Webhook notification failed: ${response.status} ${response.statusText}`);
      console.error(`   Response body: ${errorText}`);
    } else {
      console.log(`\u2705 Webhook notification sent successfully for square #${data.squareNumber}`);
    }
  } catch (error) {
    console.error("\u274C Failed to send webhook notification:", error);
    console.error(`   Webhook URL: ${webhookUrl}`);
    console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
  }
}

// server/auth.ts
import crypto from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
init_schema();
var SESSION_TTL_DEFAULT = 7 * 24 * 60 * 60 * 1e3;
var SESSION_TTL_REMEMBER = 30 * 24 * 60 * 60 * 1e3;
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}
async function verifyPassword(password, hash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    if (!salt || !key) return resolve(false);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey));
    });
  });
}
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 50);
}
function getSession() {
  const MemoryStore = createMemoryStore(session);
  return session({
    secret: process.env.SESSION_SECRET || "southbaypools-dev-secret-change-me",
    store: new MemoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_DEFAULT
    }
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use((req, _res, next) => {
    if (req.session.userId) {
      req.user = {
        claims: { sub: req.session.userId }
      };
    }
    next();
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { sql: sql2 } = await import("drizzle-orm");
      const [{ count }] = await db2.select({ count: sql2`count(*)::int` }).from(users2);
      const isFirstUser = count === 0;
      const passwordHash = await hashPassword(password);
      const operatorName = `${firstName || ""} ${lastName || ""}`.trim() || email.split("@")[0] || "My Pools";
      let baseSlug = generateSlug(operatorName);
      let slug = baseSlug;
      let suffix = 1;
      while (await storage.getOperatorBySlug(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      }
      const operator = await storage.createOperator({
        name: operatorName,
        slug,
        plan: "free",
        status: "trial",
        maxContests: 3
      });
      const user = await storage.upsertUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        passwordHash,
        operatorId: operator.id,
        role: isFirstUser ? "super_admin" : "admin",
        isAdmin: true
      });
      req.session.userId = user.id;
      req.user = { claims: { sub: user.id } };
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        return res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          operatorId: user.operatorId
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, remember } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      req.user = { claims: { sub: user.id } };
      if (remember) {
        req.session.cookie.maxAge = SESSION_TTL_REMEMBER;
      }
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        return res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          operatorId: user.operatorId
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        operatorId: user.operatorId,
        profileImageUrl: user.profileImageUrl
      });
    } catch (error) {
      console.error("Auth me error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}
var isAuthenticated = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = { claims: { sub: userId } };
  return next();
};
var isAdmin = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const dbUser = await storage.getUser(userId);
    if (!dbUser) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }
    if (!hasRolePermission(dbUser.role, "admin")) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }
    req.user = { claims: { sub: userId } };
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// server/routes.ts
init_datagolf();

// server/schedule.ts
import fs from "fs";
import path from "path";
var scheduleCache = /* @__PURE__ */ new Map();
function loadSchedule(season) {
  if (scheduleCache.has(season)) return scheduleCache.get(season);
  const csvPath = path.join(__dirname, `../data/pga-${season}-schedule.csv`);
  if (!fs.existsSync(csvPath)) {
    console.warn(`Schedule CSV not found: ${csvPath}`);
    return [];
  }
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n").slice(1);
  const schedule = lines.filter((line) => line.trim()).map((line) => {
    const parts = line.split(",");
    const weekNumber = parseInt(parts[0], 10);
    const tournamentName = parts[1]?.trim() || "";
    const startDate = parts[2]?.trim() || "";
    const endDate = parts[3]?.trim() || "";
    const location = parts[4]?.trim() || "";
    return {
      weekNumber,
      tournamentName,
      startDate: /* @__PURE__ */ new Date(startDate + "T00:00:00Z"),
      endDate: /* @__PURE__ */ new Date(endDate + "T23:59:59Z"),
      location
    };
  });
  scheduleCache.set(season, schedule);
  return schedule;
}
function getCurrentWeekFromSchedule(season) {
  const schedule = loadSchedule(season);
  if (schedule.length === 0) {
    return { week: 1, tournament: null, status: "no_schedule" };
  }
  const now = /* @__PURE__ */ new Date();
  const current = schedule.find((t) => now >= t.startDate && now <= t.endDate);
  if (current) {
    return { week: current.weekNumber, tournament: current, status: "in_progress" };
  }
  const upcoming = schedule.filter((t) => t.startDate > now).sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  if (upcoming) {
    return { week: upcoming.weekNumber, tournament: upcoming, status: "upcoming" };
  }
  const last = schedule[schedule.length - 1];
  return { week: last.weekNumber, tournament: last, status: "season_over" };
}
function getDeadlineForWeek(season, weekNumber, hoursBeforeStart = 0) {
  const schedule = loadSchedule(season);
  const tournament = schedule.find((t) => t.weekNumber === weekNumber);
  if (!tournament) return null;
  const startTime = new Date(tournament.startDate);
  startTime.setUTCHours(15, 0, 0, 0);
  const deadline = new Date(startTime.getTime() - hoursBeforeStart * 60 * 60 * 1e3);
  return deadline;
}
function hasDeadlinePassed(season, weekNumber, hoursBeforeStart = 0) {
  const deadline = getDeadlineForWeek(season, weekNumber, hoursBeforeStart);
  if (!deadline) return false;
  return /* @__PURE__ */ new Date() >= deadline;
}

// server/routes.ts
init_earningsEngine();
init_schema();
async function getOperatorId(req) {
  const user = req.user;
  if (!user?.claims?.sub) return null;
  const dbUser = await storage.getUser(user.claims.sub);
  return dbUser?.operatorId || null;
}
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.operatorId) {
        const operator = await storage.getOperator(user.operatorId);
        res.json({ ...user, operator });
      } else {
        res.json(user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/users", isAdmin, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.operatorId) {
        return res.status(400).json({ message: "No operator assigned" });
      }
      const users2 = await storage.getUsersByOperator(user.operatorId);
      res.json(users2);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.patch("/api/users/:userId/role", isAdmin, async (req, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);
      const { userId } = req.params;
      const { role } = req.body;
      const validRoles = ["super_admin", "admin", "manager", "member", "trial"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      if (role === "super_admin" && adminUser?.role !== "super_admin") {
        return res.status(403).json({ message: "Only Super Admins can assign Super Admin role" });
      }
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      if (adminUser?.role !== "super_admin" && targetUser.operatorId !== adminUser?.operatorId) {
        return res.status(403).json({ message: "Cannot manage users from other operators" });
      }
      const updatedUser = await storage.updateUserRole(userId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });
  app2.get("/api/contests", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const contests2 = await storage.getAllContests(operatorId);
      const contestsWithCounts = await Promise.all(
        contests2.map(async (contest) => {
          const squares2 = await storage.getContestSquares(contest.id);
          const takenCount = squares2.filter((s) => s.status === "taken").length;
          return {
            ...contest,
            takenSquares: takenCount,
            totalSquares: squares2.length
          };
        })
      );
      res.json(contestsWithCounts);
    } catch (error) {
      console.error("Error fetching contests:", error);
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });
  app2.get("/api/contests/:identifier", async (req, res) => {
    try {
      const identifier = req.params.identifier;
      const operatorSlug = req.query.operator;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuidLookup = uuidPattern.test(identifier);
      let contest = null;
      if (isUuidLookup) {
        contest = await storage.getContest(identifier);
      } else if (operatorSlug) {
        const operator = await storage.getOperatorBySlug(operatorSlug);
        if (!operator) {
          return res.status(404).json({ error: "Operator not found" });
        }
        contest = await storage.getContestBySlug(identifier, operator.id);
      } else {
        const primaryOperator = await storage.getOperatorBySlug("south-bay-pools");
        if (primaryOperator) {
          contest = await storage.getContestBySlug(identifier, primaryOperator.id);
        }
      }
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      res.json(contest);
    } catch (error) {
      console.error("Error fetching contest:", error);
      res.status(500).json({ error: "Failed to fetch contest" });
    }
  });
  app2.post("/api/contests", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const operator = await storage.getOperator(operatorId);
      if (operator) {
        const contestCount = await storage.countContestsByOperator(operatorId);
        if (contestCount >= operator.maxContests) {
          return res.status(403).json({
            error: "Contest limit reached",
            message: `You can have a maximum of ${operator.maxContests} contests. Upgrade your plan for more.`
          });
        }
      }
      const contestData = insertContestSchema.parse({
        ...req.body,
        eventDate: new Date(req.body.eventDate)
      });
      const contest = await storage.createContest({ ...contestData, operatorId });
      const availableSquares = req.body.availableSquares || Array.from({ length: 100 }, (_, i) => i + 1);
      const reservedSquares = req.body.reservedSquares || [];
      const reservedMap = new Map(
        reservedSquares.map((r) => [r.squareNumber, r])
      );
      const squaresToCreate = Array.from({ length: 100 }, (_, i) => {
        const index2 = i + 1;
        const reserved = reservedMap.get(index2);
        if (reserved) {
          return {
            contestId: contest.id,
            index: index2,
            row: Math.floor(i / 10),
            col: i % 10,
            status: "taken",
            entryName: reserved.entryName,
            holderName: reserved.holderName,
            holderEmail: reserved.holderEmail
          };
        } else {
          return {
            contestId: contest.id,
            index: index2,
            row: Math.floor(i / 10),
            col: i % 10,
            status: availableSquares.includes(index2) ? "available" : "disabled"
          };
        }
      });
      await storage.createSquares(squaresToCreate);
      if (contest.webhookUrl && reservedSquares.length > 0) {
        for (const reserved of reservedSquares) {
          sendWebhookNotification(contest.webhookUrl, {
            contestName: contest.name,
            contestId: contest.id,
            entryName: reserved.entryName,
            holderEmail: reserved.holderEmail,
            holderName: reserved.holderName,
            squareNumber: reserved.squareNumber,
            topTeam: contest.topTeam,
            leftTeam: contest.leftTeam,
            eventDate: contest.eventDate.toISOString()
          }).catch((err) => console.error("Webhook notification failed:", err));
        }
      }
      res.status(201).json(contest);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        console.error("POST /api/contests - Zod validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Invalid contest data", details: error.errors });
      }
      console.error("Error creating contest:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({ error: "Failed to create contest" });
    }
  });
  app2.patch("/api/contests/:id", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const contestId = req.params.id;
      const existingContest = await storage.getContest(contestId);
      if (!existingContest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      if (existingContest.operatorId !== operatorId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const bodyWithDate = req.body.eventDate ? { ...req.body, eventDate: new Date(req.body.eventDate) } : req.body;
      const updateData = updateContestSchema.parse(bodyWithDate);
      const contest = await storage.updateContest(contestId, updateData);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      if (req.body.reservedSquares !== void 0) {
        const reservedSquares = req.body.reservedSquares;
        const currentSquares = await storage.getContestSquares(contestId);
        const newReservations = [];
        const currentlyReservedSquares = currentSquares.filter(
          (s) => s.status === "taken" && s.entryName && s.holderName && s.holderEmail
        );
        const reservedSquareNumbers = new Set(reservedSquares.map((r) => r.squareNumber));
        for (const currentReserved of currentlyReservedSquares) {
          if (!reservedSquareNumbers.has(currentReserved.index)) {
            await storage.updateSquare(currentReserved.id, {
              status: "available",
              entryName: null,
              holderName: null,
              holderEmail: null
            });
          }
        }
        for (const reserved of reservedSquares) {
          const existingSquare = currentSquares.find((s) => s.index === reserved.squareNumber);
          if (existingSquare) {
            const isAlreadyReserved = existingSquare.status === "taken" && existingSquare.entryName === reserved.entryName && existingSquare.holderName === reserved.holderName && existingSquare.holderEmail === reserved.holderEmail;
            if (!isAlreadyReserved) {
              await storage.updateSquare(existingSquare.id, {
                status: "taken",
                entryName: reserved.entryName,
                holderName: reserved.holderName,
                holderEmail: reserved.holderEmail
              });
              newReservations.push(reserved);
            }
          }
        }
        if (contest.webhookUrl && newReservations.length > 0) {
          for (const reserved of newReservations) {
            sendWebhookNotification(contest.webhookUrl, {
              contestName: contest.name,
              contestId: contest.id,
              entryName: reserved.entryName,
              holderEmail: reserved.holderEmail,
              holderName: reserved.holderName,
              squareNumber: reserved.squareNumber,
              topTeam: contest.topTeam,
              leftTeam: contest.leftTeam,
              eventDate: contest.eventDate.toISOString()
            }).catch((err) => console.error("Webhook notification failed:", err));
          }
        }
      }
      res.json(contest);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating contest:", error);
      res.status(500).json({ error: "Failed to update contest" });
    }
  });
  app2.delete("/api/contests/:id", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      if (contest.operatorId !== operatorId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteContest(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contest:", error);
      res.status(500).json({ error: "Failed to delete contest" });
    }
  });
  app2.post("/api/contests/:id/clone", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const originalContest = await storage.getContest(req.params.id);
      if (!originalContest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      if (originalContest.operatorId !== operatorId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const clonedContestData = insertContestSchema.parse({
        name: req.body.name || `${originalContest.name} (Copy)`,
        topTeam: originalContest.topTeam,
        leftTeam: originalContest.leftTeam,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : /* @__PURE__ */ new Date(),
        status: "open",
        topAxisNumbers: originalContest.topAxisNumbers,
        leftAxisNumbers: originalContest.leftAxisNumbers,
        layerLabels: originalContest.layerLabels,
        showRedHeaders: false,
        prizes: originalContest.prizes,
        winners: [],
        webhookUrl: originalContest.webhookUrl
      });
      const clonedContest = await storage.createContest({ ...clonedContestData, operatorId });
      const squaresToCreate = Array.from({ length: 100 }, (_, i) => ({
        contestId: clonedContest.id,
        index: i + 1,
        row: Math.floor(i / 10),
        col: i % 10,
        status: "available"
      }));
      await storage.createSquares(squaresToCreate);
      res.status(201).json(clonedContest);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid clone data", details: error.errors });
      }
      console.error("Error cloning contest:", error);
      res.status(500).json({ error: "Failed to clone contest" });
    }
  });
  app2.get("/api/my-contests/:email", async (req, res) => {
    try {
      const email = req.params.email.toLowerCase().trim();
      const contests2 = await storage.getAllContestsGlobal();
      const participations = [];
      for (const contest of contests2) {
        const squares2 = await storage.getContestSquares(contest.id);
        const userSquares = squares2.filter(
          (s) => s.holderEmail?.toLowerCase() === email && s.status === "taken"
        );
        userSquares.forEach((square) => {
          participations.push({
            contestId: contest.id,
            contestName: contest.name,
            eventDate: contest.eventDate,
            topTeam: contest.topTeam,
            leftTeam: contest.leftTeam,
            squareNumber: square.index,
            entryName: square.entryName || ""
          });
        });
      }
      participations.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
      res.json(participations);
    } catch (error) {
      console.error("Error fetching user contests:", error);
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });
  app2.post("/api/contests/:id/test-webhook", async (req, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      if (!contest.webhookUrl) {
        return res.status(400).json({ error: "No webhook URL configured" });
      }
      const testData = {
        contestName: contest.name,
        contestId: contest.id,
        entryName: "Test Entry",
        holderEmail: "test@example.com",
        holderName: "Test User",
        squareNumber: 1,
        topTeam: contest.topTeam,
        leftTeam: contest.leftTeam,
        eventDate: contest.eventDate.toISOString()
      };
      const response = await fetch(contest.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: "test_webhook",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          data: testData
        })
      });
      if (!response.ok) {
        return res.status(502).json({
          error: "Webhook request failed",
          status: response.status,
          statusText: response.statusText
        });
      }
      res.json({
        success: true,
        message: "Test webhook sent successfully",
        payload: testData
      });
    } catch (error) {
      console.error("Error testing webhook:", error);
      res.status(500).json({
        error: "Failed to send test webhook",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/contests/:id/squares", async (req, res) => {
    try {
      const squares2 = await storage.getContestSquares(req.params.id);
      res.json(squares2);
    } catch (error) {
      console.error("Error fetching squares:", error);
      res.status(500).json({ error: "Failed to fetch squares" });
    }
  });
  app2.patch("/api/contests/:contestId/squares/:index", async (req, res) => {
    try {
      const index2 = parseInt(req.params.index);
      const updateData = updateSquareSchema.parse(req.body);
      let participantId;
      if (req.user?.claims?.sub && updateData.status === "taken" && updateData.holderEmail) {
        const authId = req.user.claims.sub;
        const sessionEmail = req.user.claims.email?.toLowerCase();
        const claimEmail = updateData.holderEmail?.toLowerCase();
        if (sessionEmail && claimEmail && sessionEmail === claimEmail) {
          let participant = await storage.getParticipantByAuthId(authId);
          if (!participant) {
            participant = await storage.getParticipantByEmail(sessionEmail);
          }
          if (participant) {
            participantId = participant.id;
          }
        }
      }
      const square = await storage.updateSquareByContestAndIndex(
        req.params.contestId,
        index2,
        { ...updateData, participantId }
      );
      if (!square) {
        return res.status(404).json({ error: "Square not found" });
      }
      if (square.status === "taken" && square.holderEmail && square.entryName) {
        const contest = await storage.getContest(req.params.contestId);
        if (contest?.webhookUrl) {
          sendWebhookNotification(contest.webhookUrl, {
            contestName: contest.name,
            contestId: contest.id,
            entryName: square.entryName,
            holderEmail: square.holderEmail,
            holderName: square.holderName || square.entryName,
            squareNumber: square.index,
            topTeam: contest.topTeam,
            leftTeam: contest.leftTeam,
            eventDate: contest.eventDate.toISOString()
          }).catch((err) => console.error("Webhook notification failed:", err));
        }
      }
      res.json(square);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating square:", error);
      res.status(500).json({ error: "Failed to update square" });
    }
  });
  app2.post("/api/contests/:id/squares/random", async (req, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      if (contest.status === "locked") {
        return res.status(400).json({ error: "Contest is locked" });
      }
      const squares2 = await storage.getContestSquares(req.params.id);
      const availableSquares = squares2.filter((s) => s.status === "available");
      if (availableSquares.length === 0) {
        return res.status(400).json({ error: "No available squares" });
      }
      const randomSquare = availableSquares[Math.floor(Math.random() * availableSquares.length)];
      const schema = z2.object({
        holderName: z2.string().min(1),
        holderEmail: z2.string().email(),
        entryName: z2.string().min(1)
      });
      const participantData = schema.parse(req.body);
      let participantId;
      if (req.user?.claims?.sub) {
        const authId = req.user.claims.sub;
        const sessionEmail = req.user.claims.email?.toLowerCase();
        const claimEmail = participantData.holderEmail?.toLowerCase();
        if (sessionEmail && claimEmail && sessionEmail === claimEmail) {
          let participant = await storage.getParticipantByAuthId(authId);
          if (!participant) {
            participant = await storage.getParticipantByEmail(sessionEmail);
          }
          if (participant) {
            participantId = participant.id;
          }
        }
      }
      const claimedSquare = await storage.updateSquareByContestAndIndex(
        req.params.id,
        randomSquare.index,
        {
          status: "taken",
          ...participantData,
          participantId
        }
      );
      if (!claimedSquare) {
        return res.status(500).json({ error: "Failed to claim square" });
      }
      if (contest.webhookUrl) {
        sendWebhookNotification(contest.webhookUrl, {
          contestName: contest.name,
          contestId: contest.id,
          entryName: participantData.entryName,
          holderEmail: participantData.holderEmail,
          holderName: participantData.holderName,
          squareNumber: claimedSquare.index,
          topTeam: contest.topTeam,
          leftTeam: contest.leftTeam,
          eventDate: contest.eventDate.toISOString()
        }).catch((err) => console.error("Webhook notification failed:", err));
      }
      res.json({
        squareNumber: claimedSquare.index,
        entryName: participantData.entryName
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid participant data", details: error.errors });
      }
      console.error("Error assigning random square:", error);
      res.status(500).json({ error: "Failed to assign random square" });
    }
  });
  app2.get("/api/folders", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const folders2 = await storage.getAllFolders(operatorId);
      res.json(folders2);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });
  app2.post("/api/folders", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const folderData = insertFolderSchema.parse(req.body);
      const folder = await storage.createFolder({ ...folderData, operatorId });
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid folder data", details: error.errors });
      }
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });
  app2.delete("/api/folders/:id", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const folder = await storage.getFolder(req.params.id);
      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }
      if (folder.operatorId !== operatorId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteFolder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });
  app2.get("/api/templates", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const templates = await storage.getAllSquareTemplates(operatorId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });
  app2.post("/api/templates", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const templateData = insertSquareTemplateSchema.parse(req.body);
      const template = await storage.createSquareTemplate({ ...templateData, operatorId });
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });
  app2.delete("/api/templates/:id", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const template = await storage.getSquareTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (template.operatorId !== operatorId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteSquareTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });
  app2.get("/api/public/contests", async (req, res) => {
    try {
      const allContests = await storage.getAllContestsGlobal();
      const publicContests = await Promise.all(
        allContests.filter((c) => c.status === "open").map(async (contest) => {
          const squares2 = await storage.getContestSquares(contest.id);
          const takenCount = squares2.filter((s) => s.status === "taken").length;
          const availableCount = squares2.filter((s) => s.status === "available").length;
          let operatorSlug = null;
          if (contest.operatorId) {
            const operator = await storage.getOperator(contest.operatorId);
            operatorSlug = operator?.slug;
          }
          return {
            id: contest.id,
            name: contest.name,
            slug: contest.slug,
            eventDate: contest.eventDate,
            topTeam: contest.topTeam,
            leftTeam: contest.leftTeam,
            takenSquares: takenCount,
            availableSquares: availableCount,
            totalSquares: squares2.length,
            operatorSlug
          };
        })
      );
      publicContests.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
      res.json(publicContests);
    } catch (error) {
      console.error("Error fetching public contests:", error);
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });
  app2.get("/api/participant/user", isAuthenticated, async (req, res) => {
    try {
      const authId = req.user.claims.sub;
      const email = req.user.claims.email;
      if (!authId) {
        return res.status(401).json({ message: "No auth ID found" });
      }
      let participant = await storage.getParticipantByAuthId(authId);
      if (participant) {
        return res.json(participant);
      }
      if (email) {
        participant = await storage.getParticipantByEmail(email);
        if (participant) {
          participant = await storage.upsertParticipant({
            ...participant,
            authId
          });
          return res.json(participant);
        }
      }
      if (!email) {
        return res.status(400).json({ message: "Email required to create participant" });
      }
      participant = await storage.upsertParticipant({
        authId,
        email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url
      });
      return res.json(participant);
    } catch (error) {
      console.error("Error fetching participant:", error);
      res.status(500).json({ message: "Failed to fetch participant" });
    }
  });
  app2.get("/api/participant/contests", isAuthenticated, async (req, res) => {
    try {
      const email = req.user.claims.email;
      if (!email) {
        return res.json([]);
      }
      const allContests = await storage.getAllContestsGlobal();
      const entries = [];
      for (const contest of allContests) {
        const squares2 = await storage.getContestSquares(contest.id);
        const userSquares = squares2.filter(
          (s) => s.holderEmail?.toLowerCase() === email.toLowerCase() && s.status === "taken"
        );
        if (userSquares.length > 0) {
          entries.push({
            contestId: contest.id,
            contestName: contest.name,
            contestSlug: contest.slug,
            eventDate: contest.eventDate,
            topTeam: contest.topTeam,
            leftTeam: contest.leftTeam,
            status: contest.status,
            squareCount: userSquares.length,
            squares: userSquares.map((s) => ({
              index: s.index,
              entryName: s.entryName
            }))
          });
        }
      }
      entries.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
      return res.json(entries);
    } catch (error) {
      console.error("Error fetching participant contests:", error);
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });
  app2.get("/api/contests/:id/export-csv", async (req, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      const squares2 = await storage.getContestSquares(contest.id);
      const csvRows = [];
      csvRows.push("Square Number,Row,Column,Status,Entry Name,Holder Name,Holder Email");
      for (const square of squares2) {
        csvRows.push(
          `${square.index},${square.row},${square.col},${square.status},"${square.entryName || ""}","${square.holderName || ""}","${square.holderEmail || ""}"`
        );
      }
      const csv = csvRows.join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="contest-${contest.id}-export.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting contest to CSV:", error);
      res.status(500).json({ error: "Failed to export contest" });
    }
  });
  app2.get("/api/golf/tournaments", async (req, res) => {
    try {
      const season = req.query.season ? parseInt(req.query.season) : void 0;
      const tournaments = await storage.getAllGolfTournaments(season);
      return res.json(tournaments);
    } catch (error) {
      console.error("Error fetching golf tournaments:", error);
      return res.status(500).json({ error: "Failed to fetch tournaments" });
    }
  });
  app2.get("/api/golf/tournaments/:id", async (req, res) => {
    try {
      const tournament = await storage.getGolfTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      return res.json(tournament);
    } catch (error) {
      console.error("Error fetching tournament:", error);
      return res.status(500).json({ error: "Failed to fetch tournament" });
    }
  });
  app2.post("/api/golf/tournaments", isAdmin, async (req, res) => {
    try {
      const validation = insertGolfTournamentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      const tournament = await storage.createGolfTournament(validation.data);
      return res.json(tournament);
    } catch (error) {
      console.error("Error creating tournament:", error);
      return res.status(500).json({ error: "Failed to create tournament" });
    }
  });
  app2.post("/api/golf/tournaments/bulk", isAdmin, async (req, res) => {
    try {
      const tournaments = req.body.tournaments;
      if (!Array.isArray(tournaments)) {
        return res.status(400).json({ error: "tournaments must be an array" });
      }
      const created = [];
      for (const t of tournaments) {
        const tournament = await storage.createGolfTournament({
          name: t.name,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
          season: t.season,
          weekNumber: t.weekNumber
        });
        created.push(tournament);
      }
      return res.json({ created: created.length, tournaments: created });
    } catch (error) {
      console.error("Error bulk importing tournaments:", error);
      return res.status(500).json({ error: "Failed to import tournaments" });
    }
  });
  app2.patch("/api/golf/tournaments/:id", isAdmin, async (req, res) => {
    try {
      const tournament = await storage.updateGolfTournament(req.params.id, req.body);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      return res.json(tournament);
    } catch (error) {
      console.error("Error updating tournament:", error);
      return res.status(500).json({ error: "Failed to update tournament" });
    }
  });
  app2.delete("/api/golf/tournaments/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteGolfTournament(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tournament:", error);
      return res.status(500).json({ error: "Failed to delete tournament" });
    }
  });
  app2.get("/api/golf/pools", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const pools = await storage.getAllGolfPools(operatorId);
      return res.json(pools);
    } catch (error) {
      console.error("Error fetching golf pools:", error);
      return res.status(500).json({ error: "Failed to fetch pools" });
    }
  });
  app2.get("/api/golf/pools/:id", async (req, res) => {
    try {
      const pool2 = await storage.getGolfPool(req.params.id);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const entries = await storage.getGolfPoolEntries(req.params.id);
      return res.json({ ...pool2, entries });
    } catch (error) {
      console.error("Error fetching pool:", error);
      return res.status(500).json({ error: "Failed to fetch pool" });
    }
  });
  app2.post("/api/golf/pools", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      const validation = insertGolfPoolSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      const pool2 = await storage.createGolfPool({ ...validation.data, operatorId });
      return res.json(pool2);
    } catch (error) {
      console.error("Error creating pool:", error);
      return res.status(500).json({ error: "Failed to create pool" });
    }
  });
  app2.patch("/api/golf/pools/:id", isAdmin, async (req, res) => {
    try {
      const pool2 = await storage.updateGolfPool(req.params.id, req.body);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      return res.json(pool2);
    } catch (error) {
      console.error("Error updating pool:", error);
      return res.status(500).json({ error: "Failed to update pool" });
    }
  });
  app2.delete("/api/golf/pools/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteGolfPool(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pool:", error);
      return res.status(500).json({ error: "Failed to delete pool" });
    }
  });
  app2.get("/api/golf/pools/:poolId/entries", async (req, res) => {
    try {
      const entries = await storage.getGolfPoolEntries(req.params.poolId);
      return res.json(entries);
    } catch (error) {
      console.error("Error fetching pool entries:", error);
      return res.status(500).json({ error: "Failed to fetch entries" });
    }
  });
  app2.get("/api/golf/pools/:poolId/export-csv", isAdmin, async (req, res) => {
    try {
      const pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const entries = await storage.getGolfPoolEntries(req.params.poolId);
      const csvRows = [];
      csvRows.push("Entry Name,Email,Status,Created At");
      for (const entry of entries) {
        const createdAt = entry.createdAt ? new Date(entry.createdAt).toISOString() : "";
        csvRows.push(
          `"${(entry.entryName || "").replace(/"/g, '""')}","${(entry.email || "").replace(/"/g, '""')}","${entry.status}","${createdAt}"`
        );
      }
      const csv = csvRows.join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="golf-pool-${pool2.slug || pool2.id}-entries.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting golf pool entries:", error);
      return res.status(500).json({ error: "Failed to export entries" });
    }
  });
  app2.post("/api/golf/pools/:poolId/entries", isAdmin, async (req, res) => {
    try {
      const pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const validation = insertGolfPoolEntrySchema.safeParse({
        ...req.body,
        poolId: req.params.poolId
      });
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      const entry = await storage.createGolfPoolEntry(validation.data);
      return res.json(entry);
    } catch (error) {
      console.error("Error creating pool entry:", error);
      return res.status(500).json({ error: "Failed to create entry" });
    }
  });
  app2.get("/api/golf/entries/:entryId", async (req, res) => {
    try {
      const entry = await storage.getGolfPoolEntry(req.params.entryId);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      return res.json(entry);
    } catch (error) {
      console.error("Error fetching entry:", error);
      return res.status(500).json({ error: "Failed to fetch entry" });
    }
  });
  app2.patch("/api/golf/entries/:id", isAdmin, async (req, res) => {
    try {
      const entry = await storage.updateGolfPoolEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      return res.json(entry);
    } catch (error) {
      console.error("Error updating entry:", error);
      return res.status(500).json({ error: "Failed to update entry" });
    }
  });
  app2.delete("/api/golf/entries/:id", isAdmin, async (req, res) => {
    try {
      const entry = await storage.getGolfPoolEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      await storage.deleteGolfPoolEntry(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting entry:", error);
      return res.status(500).json({ error: "Failed to delete entry" });
    }
  });
  app2.post("/api/golf/entries/:entryId/admin-pick", isAdmin, async (req, res) => {
    try {
      const { golferName, weekNumber, tournamentName } = req.body;
      if (!golferName || weekNumber === void 0) {
        return res.status(400).json({ error: "Golfer name and week number are required" });
      }
      const entry = await storage.getGolfPoolEntry(req.params.entryId);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      if (entry.status === "eliminated") {
        return res.status(400).json({ error: "Entry has been eliminated" });
      }
      const pool2 = await storage.getGolfPool(entry.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const usedGolfers = entry.usedGolfers || [];
      if (usedGolfers.includes(golferName)) {
        return res.status(400).json({ error: "Golfer has already been used" });
      }
      const existingPicks = await storage.getGolfPicks(req.params.entryId);
      const existingPickThisWeek = existingPicks.find((p) => p.weekNumber === weekNumber);
      if (existingPickThisWeek) {
        const oldGolfer = existingPickThisWeek.golferName;
        if (oldGolfer !== golferName) {
          await storage.createGolfPickHistory({
            pickId: existingPickThisWeek.id,
            entryId: existingPickThisWeek.entryId,
            poolId: existingPickThisWeek.poolId,
            weekNumber: existingPickThisWeek.weekNumber,
            golferName: oldGolfer,
            tournamentName: existingPickThisWeek.tournamentName,
            changedBy: "admin",
            reason: `Admin changed from ${oldGolfer} to ${golferName}`
          });
        }
        const updatedPick = await storage.updateGolfPick(existingPickThisWeek.id, {
          golferName,
          tournamentName: tournamentName || null,
          updatedAt: /* @__PURE__ */ new Date()
        });
        const newUsedGolfers = usedGolfers.filter((g) => g !== oldGolfer);
        newUsedGolfers.push(golferName);
        await storage.updateGolfPoolEntry(entry.id, { usedGolfers: newUsedGolfers });
        return res.json(updatedPick);
      } else {
        const pick = await storage.createGolfPick({
          entryId: req.params.entryId,
          poolId: entry.poolId,
          weekNumber,
          golferName,
          tournamentName: tournamentName || null
        });
        usedGolfers.push(golferName);
        await storage.updateGolfPoolEntry(entry.id, { usedGolfers });
        return res.json(pick);
      }
    } catch (error) {
      console.error("Error creating admin pick:", error);
      return res.status(500).json({ error: "Failed to create pick" });
    }
  });
  app2.post("/api/golf/entries/:entryId/reset-golfer", isAdmin, async (req, res) => {
    try {
      const { golferName } = req.body;
      if (!golferName) {
        return res.status(400).json({ error: "Golfer name is required" });
      }
      const entry = await storage.getGolfPoolEntry(req.params.entryId);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      const usedGolfers = entry.usedGolfers || [];
      if (!usedGolfers.includes(golferName)) {
        return res.status(400).json({ error: "Golfer is not in the used list" });
      }
      const newUsedGolfers = usedGolfers.filter((g) => g !== golferName);
      await storage.updateGolfPoolEntry(entry.id, { usedGolfers: newUsedGolfers });
      res.json({
        success: true,
        message: `${golferName} has been made eligible again`,
        usedGolfers: newUsedGolfers
      });
    } catch (error) {
      console.error("Error resetting golfer:", error);
      res.status(500).json({ error: "Failed to reset golfer" });
    }
  });
  app2.get("/api/golf/entries/:entryId/pick-history", isAdmin, async (req, res) => {
    try {
      const entry = await storage.getGolfPoolEntry(req.params.entryId);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      const history = await storage.getGolfPickHistoryForEntry(req.params.entryId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching pick history:", error);
      res.status(500).json({ error: "Failed to fetch pick history" });
    }
  });
  app2.get("/api/golf/pools/:poolId/pick-history", isAdmin, async (req, res) => {
    try {
      const pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const entries = await storage.getGolfPoolEntries(pool2.id);
      const allHistory = await Promise.all(
        entries.map(async (entry) => {
          const history = await storage.getGolfPickHistoryForEntry(entry.id);
          return history.map((h) => ({
            ...h,
            entryName: entry.entryName,
            entryEmail: entry.email
          }));
        })
      );
      const flatHistory = allHistory.flat().sort(
        (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
      );
      res.json(flatHistory);
    } catch (error) {
      console.error("Error fetching pool pick history:", error);
      res.status(500).json({ error: "Failed to fetch pick history" });
    }
  });
  app2.post("/api/golf/pools/:poolId/run-cut-check", isAdmin, async (req, res) => {
    try {
      const { weekNumber } = req.body;
      if (!weekNumber) {
        return res.status(400).json({ error: "Week number is required" });
      }
      const pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const liveData = await dataGolfService.getLiveTournamentData("pga");
      if (!liveData) {
        return res.status(400).json({ error: "No active tournament data available from DataGolf" });
      }
      const picks = await storage.getGolfPicksForWeek(req.params.poolId, weekNumber);
      const entries = await storage.getGolfPoolEntries(req.params.poolId);
      const entryNameMap = /* @__PURE__ */ new Map();
      entries.forEach((entry) => {
        entryNameMap.set(entry.id, entry.entryName);
      });
      const normalizeGolferName = (name) => {
        const normalized = name.toLowerCase().trim();
        const variants = [normalized];
        if (normalized.includes(",")) {
          const parts = normalized.split(",").map((s) => s.trim());
          if (parts.length === 2) {
            variants.push(`${parts[1]} ${parts[0]}`);
          }
        } else if (normalized.includes(" ")) {
          const parts = normalized.split(" ");
          if (parts.length >= 2) {
            const firstName = parts.slice(0, -1).join(" ");
            const lastName = parts[parts.length - 1];
            variants.push(`${lastName}, ${firstName}`);
          }
        }
        return variants;
      };
      const golferStatusMap = /* @__PURE__ */ new Map();
      liveData.players.forEach((player) => {
        const variants = normalizeGolferName(player.name);
        variants.forEach((variant) => {
          golferStatusMap.set(variant, player.status);
        });
      });
      const results = {
        checked: 0,
        eliminated: 0,
        madeCut: 0,
        notFound: 0,
        details: []
      };
      for (const pick of picks) {
        results.checked++;
        const golferKey = pick.golferName.toLowerCase().trim();
        let status = golferStatusMap.get(golferKey);
        if (!status) {
          const pickVariants = normalizeGolferName(pick.golferName);
          for (const variant of pickVariants) {
            status = golferStatusMap.get(variant);
            if (status) break;
          }
        }
        const entryName = entryNameMap.get(pick.entryId) || "Unknown";
        console.log(`Cut check: golfer="${pick.golferName}", key="${golferKey}", found=${!!status}, round=${liveData.currentRound}`);
        if (!status && liveData.currentRound >= 3) {
          status = "cut";
          console.log(`Cut check: "${pick.golferName}" not in in-play data (round ${liveData.currentRound}), marking as CUT`);
        }
        if (!status) {
          results.notFound++;
          results.details.push({
            entryName,
            golferName: pick.golferName,
            status: "not found",
            action: "skipped"
          });
          continue;
        }
        if (status === "cut" || status === "wd" || status === "dq") {
          await storage.updateGolfPick(pick.id, {
            result: "eliminated",
            updatedAt: /* @__PURE__ */ new Date()
          });
          await storage.updateGolfPoolEntry(pick.entryId, {
            status: "eliminated"
          });
          results.eliminated++;
          results.details.push({
            entryName,
            golferName: pick.golferName,
            status,
            action: "eliminated"
          });
        } else {
          await storage.updateGolfPick(pick.id, {
            result: "survived",
            updatedAt: /* @__PURE__ */ new Date()
          });
          results.madeCut++;
          results.details.push({
            entryName,
            golferName: pick.golferName,
            status: "active",
            action: "survived"
          });
        }
      }
      return res.json({
        success: true,
        tournamentName: liveData.eventName,
        currentRound: liveData.currentRound,
        lastUpdated: liveData.lastUpdated,
        results
      });
    } catch (error) {
      console.error("Error running cut check:", error);
      return res.status(500).json({ error: "Failed to run cut check" });
    }
  });
  app2.get("/api/datagolf/live", async (req, res) => {
    try {
      const tour = req.query.tour || "pga";
      const liveData = await dataGolfService.getLiveTournamentData(tour);
      if (!liveData) {
        return res.status(404).json({ error: "No active tournament" });
      }
      return res.json(liveData);
    } catch (error) {
      console.error("Error fetching live tournament data:", error);
      return res.status(500).json({ error: "Failed to fetch live data" });
    }
  });
  app2.get("/api/golf/pools/:poolId/current-week", async (req, res) => {
    try {
      const pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const { week, tournament, status } = getCurrentWeekFromSchedule(pool2.season);
      const pickDeadlineHours = pool2.pickDeadlineHours || 0;
      const deadline = getDeadlineForWeek(pool2.season, week, pickDeadlineHours);
      const deadlinePassed = hasDeadlinePassed(pool2.season, week, pickDeadlineHours);
      return res.json({
        currentWeek: week,
        tournamentName: tournament?.tournamentName || null,
        startDate: tournament?.startDate.toISOString() || null,
        endDate: tournament?.endDate.toISOString() || null,
        deadlineTime: deadline?.toISOString() || null,
        deadlinePassed,
        detectionMethod: "schedule_csv",
        scheduleStatus: status
      });
    } catch (error) {
      console.error("Error detecting current week:", error);
      return res.status(500).json({ error: "Failed to detect current week" });
    }
  });
  app2.get("/api/golf/entries/:entryId/picks", async (req, res) => {
    try {
      const picks = await storage.getGolfPicks(req.params.entryId);
      return res.json(picks);
    } catch (error) {
      console.error("Error fetching picks:", error);
      return res.status(500).json({ error: "Failed to fetch picks" });
    }
  });
  app2.get("/api/golf/pools/:poolId/picks/:weekNumber", async (req, res) => {
    try {
      const weekNumber = parseInt(req.params.weekNumber);
      const picks = await storage.getGolfPicksForWeek(req.params.poolId, weekNumber);
      return res.json(picks);
    } catch (error) {
      console.error("Error fetching picks for week:", error);
      return res.status(500).json({ error: "Failed to fetch picks" });
    }
  });
  app2.get("/api/golf/pools/:poolId/all-picks", isAdmin, async (req, res) => {
    try {
      const pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const entries = await storage.getGolfPoolEntries(req.params.poolId);
      const allPicks = [];
      for (const entry of entries) {
        const picks = await storage.getGolfPicks(entry.id);
        for (const pick of picks) {
          allPicks.push({
            ...pick,
            entryName: entry.entryName,
            entryEmail: entry.email
          });
        }
      }
      allPicks.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
      return res.json(allPicks);
    } catch (error) {
      console.error("Error fetching all picks:", error);
      return res.status(500).json({ error: "Failed to fetch picks" });
    }
  });
  app2.get("/api/golf/pools/:poolId/mismatched-picks", async (req, res) => {
    try {
      const pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const tournaments = await storage.getAllGolfTournaments(pool2.season);
      const entries = await storage.getGolfPoolEntries(pool2.id);
      const tournamentToWeek = /* @__PURE__ */ new Map();
      for (const t of tournaments) {
        if (t.weekNumber && t.name) {
          const normalizedName = t.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          tournamentToWeek.set(normalizedName, t.weekNumber);
        }
      }
      const mismatchedPicks = [];
      for (const entry of entries) {
        const picks = await storage.getGolfPicks(entry.id);
        for (const pick of picks) {
          if (!pick.tournamentName) continue;
          const normalizedPickTournament = pick.tournamentName.toLowerCase().replace(/[^a-z0-9]/g, "");
          let suggestedWeek = null;
          const tournamentEntries = Array.from(tournamentToWeek.entries());
          for (const [normalizedTournament, week] of tournamentEntries) {
            if (normalizedPickTournament.includes(normalizedTournament) || normalizedTournament.includes(normalizedPickTournament)) {
              suggestedWeek = week;
              break;
            }
          }
          if (suggestedWeek !== null && suggestedWeek !== pick.weekNumber) {
            mismatchedPicks.push({
              pickId: pick.id,
              entryId: entry.id,
              entryName: entry.entryName,
              entryEmail: entry.email,
              golferName: pick.golferName,
              savedWeekNumber: pick.weekNumber,
              tournamentName: pick.tournamentName,
              suggestedWeekNumber: suggestedWeek,
              createdAt: pick.createdAt?.toISOString() || "",
              updatedAt: pick.updatedAt?.toISOString() || ""
            });
          }
        }
      }
      return res.json(mismatchedPicks);
    } catch (error) {
      console.error("Error detecting mismatched picks:", error);
      return res.status(500).json({ error: "Failed to detect mismatched picks" });
    }
  });
  app2.post("/api/golf/picks/:pickId/fix-week", async (req, res) => {
    try {
      const { newWeekNumber, newTournamentName } = req.body;
      if (!newWeekNumber || typeof newWeekNumber !== "number") {
        return res.status(400).json({ error: "newWeekNumber is required" });
      }
      const pick = await storage.getGolfPick(req.params.pickId);
      if (!pick) {
        return res.status(404).json({ error: "Pick not found" });
      }
      await storage.createGolfPickHistory({
        pickId: pick.id,
        entryId: pick.entryId,
        poolId: pick.poolId,
        weekNumber: pick.weekNumber,
        golferName: pick.golferName,
        tournamentName: pick.tournamentName,
        changedBy: "system",
        reason: `Admin fix: Week ${pick.weekNumber} -> ${newWeekNumber}`
      });
      const updateData = { weekNumber: newWeekNumber };
      if (newTournamentName) {
        updateData.tournamentName = newTournamentName;
      }
      const updatedPick = await storage.updateGolfPick(pick.id, updateData);
      return res.json(updatedPick);
    } catch (error) {
      console.error("Error fixing pick week:", error);
      return res.status(500).json({ error: "Failed to fix pick week" });
    }
  });
  app2.get("/api/golf/pools/:poolId/late-edited-picks", async (req, res) => {
    try {
      const pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const tournaments = await storage.getAllGolfTournaments(pool2.season);
      const entries = await storage.getGolfPoolEntries(pool2.id);
      const lateEditedPicks = [];
      for (const entry of entries) {
        const picks = await storage.getGolfPicks(entry.id);
        for (const pick of picks) {
          if (!pick.updatedAt || !pick.createdAt) continue;
          const weekTournament = tournaments.find((t) => t.weekNumber === pick.weekNumber);
          if (!weekTournament || !weekTournament.endDate) continue;
          const tournamentEnd = new Date(weekTournament.endDate);
          const pickUpdated = new Date(pick.updatedAt);
          const pickCreated = new Date(pick.createdAt);
          if (pickUpdated > tournamentEnd && pickUpdated.getTime() !== pickCreated.getTime()) {
            const nextTournament = tournaments.find(
              (t) => t.weekNumber === pick.weekNumber + 1
            );
            lateEditedPicks.push({
              pickId: pick.id,
              entryId: entry.id,
              entryName: entry.entryName,
              entryEmail: entry.email,
              golferName: pick.golferName,
              savedWeekNumber: pick.weekNumber,
              tournamentName: pick.tournamentName,
              suggestedWeekNumber: pick.weekNumber + 1,
              suggestedTournamentName: nextTournament?.name || null,
              createdAt: pick.createdAt.toISOString(),
              updatedAt: pick.updatedAt.toISOString(),
              tournamentEndDate: tournamentEnd.toISOString()
            });
          }
        }
      }
      return res.json(lateEditedPicks);
    } catch (error) {
      console.error("Error detecting late-edited picks:", error);
      return res.status(500).json({ error: "Failed to detect late-edited picks" });
    }
  });
  app2.post("/api/golf/pools/:poolId/fix-late-edited-picks", async (req, res) => {
    try {
      const pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const { picks } = req.body;
      if (!Array.isArray(picks)) {
        return res.status(400).json({ error: "picks array is required" });
      }
      const results = [];
      for (const pickData of picks) {
        const { pickId, newWeekNumber, newTournamentName } = pickData;
        const pick = await storage.getGolfPick(pickId);
        if (pick) {
          await storage.createGolfPickHistory({
            pickId: pick.id,
            entryId: pick.entryId,
            poolId: pick.poolId,
            weekNumber: pick.weekNumber,
            golferName: pick.golferName,
            tournamentName: pick.tournamentName,
            changedBy: "system",
            reason: `Bulk fix: Week ${pick.weekNumber} -> ${newWeekNumber}`
          });
          const updateData = { weekNumber: newWeekNumber };
          if (newTournamentName) {
            updateData.tournamentName = newTournamentName;
          }
          await storage.updateGolfPick(pickId, updateData);
          results.push({ pickId, success: true });
        } else {
          results.push({ pickId, success: false, error: "Pick not found" });
        }
      }
      return res.json({ fixed: results.filter((r) => r.success).length, results });
    } catch (error) {
      console.error("Error bulk fixing picks:", error);
      return res.status(500).json({ error: "Failed to bulk fix picks" });
    }
  });
  app2.post("/api/golf/entries/:entryId/picks", async (req, res) => {
    try {
      const entry = await storage.getGolfPoolEntry(req.params.entryId);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      if (entry.status === "eliminated") {
        return res.status(400).json({ error: "Entry has been eliminated" });
      }
      const usedGolfers = entry.usedGolfers || [];
      if (usedGolfers.includes(req.body.golferName)) {
        return res.status(400).json({ error: "This golfer has already been used" });
      }
      const pool2 = await storage.getGolfPool(entry.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const pickWeek = req.body.weekNumber;
      const pickDeadlineHours = pool2.pickDeadlineHours || 0;
      const { week: scheduleWeek } = getCurrentWeekFromSchedule(pool2.season);
      if (pickWeek !== scheduleWeek) {
        return res.status(400).json({
          error: `Cannot submit pick for week ${pickWeek}. Current week is ${scheduleWeek}.`
        });
      }
      if (hasDeadlinePassed(pool2.season, pickWeek, pickDeadlineHours)) {
        return res.status(400).json({
          error: "Pick deadline has passed for this week. Tournament has already started."
        });
      }
      let tournamentId = null;
      let tournamentName = req.body.tournamentName || null;
      if (req.body.tournamentId) {
        const tournament = await storage.getGolfTournament(req.body.tournamentId);
        if (tournament) {
          tournamentId = tournament.id;
          tournamentName = tournament.name;
        }
      }
      const pickData = {
        entryId: req.params.entryId,
        poolId: entry.poolId,
        weekNumber: req.body.weekNumber,
        golferName: req.body.golferName,
        tournamentId,
        tournamentName
      };
      const validation = insertGolfPickSchema.safeParse(pickData);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      const pick = await storage.createGolfPick(validation.data);
      await storage.updateGolfPoolEntry(entry.id, {
        usedGolfers: [...usedGolfers, req.body.golferName]
      });
      if (pool2.webhookUrl) {
        void sendGolfPickWebhookNotification(pool2.webhookUrl, {
          poolName: pool2.name,
          poolId: pool2.id,
          entryName: entry.entryName,
          recipientEmail: entry.email,
          recipientName: entry.entryName,
          golferName: req.body.golferName,
          tournamentName: tournamentName || "Unknown Tournament",
          weekNumber: req.body.weekNumber
        }).catch((err) => console.error("Golf webhook notification failed:", err));
      }
      return res.json(pick);
    } catch (error) {
      console.error("Error creating pick:", error);
      return res.status(500).json({ error: "Failed to create pick" });
    }
  });
  app2.patch("/api/golf/picks/:id", isAdmin, async (req, res) => {
    try {
      const pick = await storage.updateGolfPick(req.params.id, req.body);
      if (!pick) {
        return res.status(404).json({ error: "Pick not found" });
      }
      if (req.body.result === "eliminated") {
        const entry = await storage.getGolfPoolEntry(pick.entryId);
        if (entry) {
          await storage.updateGolfPoolEntry(entry.id, {
            status: "eliminated",
            eliminatedWeek: pick.weekNumber
          });
        }
      }
      return res.json(pick);
    } catch (error) {
      console.error("Error updating pick:", error);
      return res.status(500).json({ error: "Failed to update pick" });
    }
  });
  app2.get("/api/datagolf/rankings", async (req, res) => {
    try {
      if (!dataGolfService.isConfigured()) {
        return res.status(503).json({ error: "DataGolf API not configured" });
      }
      const rankings = await dataGolfService.getRankings();
      return res.json(rankings);
    } catch (error) {
      console.error("Error fetching DataGolf rankings:", error);
      return res.status(500).json({ error: "Failed to fetch rankings" });
    }
  });
  app2.get("/api/datagolf/field", async (req, res) => {
    try {
      if (!dataGolfService.isConfigured()) {
        return res.status(503).json({ error: "DataGolf API not configured" });
      }
      const tour = req.query.tour || "pga";
      const field = await dataGolfService.getCurrentField(tour);
      return res.json(field);
    } catch (error) {
      console.error("Error fetching DataGolf field:", error);
      return res.status(500).json({ error: "Failed to fetch field" });
    }
  });
  app2.get("/api/datagolf/search", async (req, res) => {
    try {
      if (!dataGolfService.isConfigured()) {
        return res.status(503).json({ error: "DataGolf API not configured" });
      }
      const query = req.query.q;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const golfers = await dataGolfService.searchGolfers(query);
      return res.json(golfers);
    } catch (error) {
      console.error("Error searching golfers:", error);
      return res.status(500).json({ error: "Failed to search golfers" });
    }
  });
  app2.get("/api/datagolf/status", async (req, res) => {
    return res.json({ configured: dataGolfService.isConfigured() });
  });
  app2.get("/api/public/golf/pools", async (req, res) => {
    try {
      const { operators: operators2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq3 } = await import("drizzle-orm");
      const primaryOperator = await storage.getOperatorBySlug("south-bay-pools");
      if (!primaryOperator) {
        return res.json([]);
      }
      const pools = await storage.getAllGolfPools(primaryOperator.id);
      const publicPools = await Promise.all(
        pools.filter((p) => p.status === "active" || p.status === "upcoming").map(async (pool2) => {
          const entries = await storage.getGolfPoolEntries(pool2.id);
          return {
            id: pool2.id,
            name: pool2.name,
            slug: pool2.slug,
            season: pool2.season,
            entryFee: pool2.entryFee,
            entryCount: entries.length,
            currentWeek: pool2.currentWeek
          };
        })
      );
      res.json(publicPools);
    } catch (error) {
      console.error("Error fetching public golf pools:", error);
      res.status(500).json({ error: "Failed to fetch pools" });
    }
  });
  app2.get("/api/public/golf/pools/:identifier", async (req, res) => {
    try {
      const { identifier } = req.params;
      let pool2 = await storage.getGolfPool(identifier);
      if (!pool2) {
        pool2 = await storage.getGolfPoolBySlug(identifier);
      }
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const entries = await storage.getGolfPoolEntries(pool2.id);
      res.json({
        id: pool2.id,
        name: pool2.name,
        slug: pool2.slug,
        season: pool2.season,
        entryFee: pool2.entryFee,
        currentWeek: pool2.currentWeek,
        entryCount: entries.length,
        status: pool2.status
      });
    } catch (error) {
      console.error("Error fetching public golf pool:", error);
      res.status(500).json({ error: "Failed to fetch pool" });
    }
  });
  app2.post("/api/participant/golf/pools/:poolId/signup", isAuthenticated, async (req, res) => {
    try {
      const { poolId } = req.params;
      const { entryName } = req.body;
      if (!entryName || typeof entryName !== "string" || entryName.trim().length === 0) {
        return res.status(400).json({ error: "Entry name is required" });
      }
      if (entryName.trim().length > 100) {
        return res.status(400).json({ error: "Entry name is too long (max 100 characters)" });
      }
      let pool2;
      try {
        pool2 = await storage.getGolfPool(poolId);
      } catch (err) {
        console.error("Error fetching pool:", err);
        return res.status(500).json({ error: "Unable to process request" });
      }
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      if (pool2.status !== "active" && pool2.status !== "upcoming") {
        return res.status(400).json({ error: "This pool is no longer accepting registrations" });
      }
      const authId = req.user.claims.sub;
      const email = req.user.claims.email;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      let participant;
      let isNewUser = false;
      try {
        participant = await storage.getParticipantByAuthId(authId);
        if (!participant) {
          isNewUser = true;
          participant = await storage.upsertParticipant({
            authId,
            email,
            firstName: req.user.claims.first_name,
            lastName: req.user.claims.last_name,
            profileImageUrl: req.user.claims.profile_image_url
          });
        }
      } catch (err) {
        console.error("Error managing participant:", err);
        return res.status(500).json({ error: "Unable to process request" });
      }
      let existingEntries = [];
      try {
        existingEntries = await storage.getGolfPoolEntriesByEmail(email);
      } catch (err) {
        console.error("Error fetching existing entries:", err);
      }
      const entryNumber = existingEntries.filter((e) => e.poolId === poolId).length + 1;
      let entry;
      try {
        entry = await storage.createGolfPoolEntry({
          poolId,
          entryName: entryName.trim(),
          email,
          participantId: participant.id,
          status: "active"
        });
      } catch (err) {
        console.error("Error creating entry:", err);
        return res.status(500).json({ error: "Unable to create entry" });
      }
      if (pool2.webhookUrl) {
        const recipientName = [req.user.claims.first_name, req.user.claims.last_name].filter(Boolean).join(" ") || email;
        if (isNewUser) {
          void sendGolfSignupWebhookNotification(pool2.webhookUrl, {
            poolName: pool2.name,
            poolId: pool2.id,
            recipientEmail: email,
            recipientName
          }).catch((err) => console.error("Signup webhook error:", err));
        }
        void sendGolfEntryWebhookNotification(pool2.webhookUrl, {
          poolName: pool2.name,
          poolId: pool2.id,
          entryName: entry.entryName,
          entryNumber,
          recipientEmail: email,
          recipientName
        }).catch((err) => console.error("Entry webhook error:", err));
      }
      res.json(entry);
    } catch (error) {
      console.error("Error in golf pool signup:", error);
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  });
  app2.get("/api/participant/golf/entries", isAuthenticated, async (req, res) => {
    try {
      const email = req.user.claims.email;
      if (!email) {
        return res.status(400).json({ error: "Email not found" });
      }
      const entries = await storage.getGolfPoolEntriesByEmail(email);
      const entriesWithPool = await Promise.all(
        entries.map(async (entry) => {
          const pool2 = await storage.getGolfPool(entry.poolId);
          return {
            ...entry,
            poolName: pool2?.name,
            poolSlug: pool2?.slug,
            poolSeason: pool2?.season,
            poolCurrentWeek: pool2?.currentWeek
          };
        })
      );
      res.json(entriesWithPool);
    } catch (error) {
      console.error("Error fetching participant golf entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });
  app2.get("/api/golf/entry/token/:token", async (req, res) => {
    try {
      const entry = await storage.getGolfPoolEntryByToken(req.params.token);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      const pool2 = await storage.getGolfPool(entry.poolId);
      const picks = await storage.getGolfPicks(entry.id);
      res.json({
        entry,
        pool: pool2 ? {
          id: pool2.id,
          name: pool2.name,
          slug: pool2.slug,
          season: pool2.season,
          currentWeek: pool2.currentWeek,
          status: pool2.status
        } : null,
        picks
      });
    } catch (error) {
      console.error("Error fetching entry by token:", error);
      res.status(500).json({ error: "Failed to fetch entry" });
    }
  });
  app2.put("/api/golf/entries/:entryId/picks/:weekNumber", async (req, res) => {
    try {
      const { entryId, weekNumber } = req.params;
      const weekNum = parseInt(weekNumber);
      const entry = await storage.getGolfPoolEntry(entryId);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      if (entry.status === "eliminated") {
        return res.status(400).json({ error: "Entry has been eliminated" });
      }
      const pool2 = await storage.getGolfPool(entry.poolId);
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const pickDeadlineHours = pool2.pickDeadlineHours || 0;
      if (hasDeadlinePassed(pool2.season, weekNum, pickDeadlineHours)) {
        return res.status(400).json({
          error: "Pick deadline has passed for this week. You cannot change your pick after the tournament starts."
        });
      }
      const existingPicks = await storage.getGolfPicks(entryId);
      const existingPick = existingPicks.find((p) => p.weekNumber === weekNum);
      if (!existingPick) {
        return res.status(404).json({ error: "No pick found for this week. Use POST to create a new pick." });
      }
      const newGolferName = req.body.golferName;
      const oldGolferName = existingPick.golferName;
      if (newGolferName !== oldGolferName) {
        const usedGolfers = entry.usedGolfers || [];
        const usedExcludingCurrent = usedGolfers.filter((g) => g !== oldGolferName);
        if (usedExcludingCurrent.includes(newGolferName)) {
          return res.status(400).json({ error: "This golfer has already been used" });
        }
        await storage.createGolfPickHistory({
          pickId: existingPick.id,
          entryId: existingPick.entryId,
          poolId: existingPick.poolId,
          weekNumber: existingPick.weekNumber,
          golferName: oldGolferName,
          tournamentName: existingPick.tournamentName,
          changedBy: "user",
          reason: `Changed from ${oldGolferName} to ${newGolferName}`
        });
        const newUsedGolfers = [...usedExcludingCurrent, newGolferName];
        await storage.updateGolfPoolEntry(entry.id, {
          usedGolfers: newUsedGolfers
        });
      }
      const updatedPick = await storage.updateGolfPick(existingPick.id, {
        golferName: newGolferName,
        tournamentName: req.body.tournamentName || existingPick.tournamentName,
        updatedAt: /* @__PURE__ */ new Date()
      });
      if (pool2.webhookUrl) {
        void sendGolfPickWebhookNotification(pool2.webhookUrl, {
          poolName: pool2.name,
          poolId: pool2.id,
          entryName: entry.entryName,
          recipientEmail: entry.email,
          recipientName: entry.entryName,
          golferName: newGolferName,
          tournamentName: req.body.tournamentName || existingPick.tournamentName || "Unknown Tournament",
          weekNumber: weekNum
        }).catch((err) => console.error("Golf webhook notification failed:", err));
      }
      res.json(updatedPick);
    } catch (error) {
      console.error("Error updating pick:", error);
      res.status(500).json({ error: "Failed to update pick" });
    }
  });
  app2.get("/api/public/golf/pools/:poolId/leaderboard", async (req, res) => {
    try {
      let pool2 = await storage.getGolfPool(req.params.poolId);
      if (!pool2) {
        pool2 = await storage.getGolfPoolBySlug(req.params.poolId);
      }
      if (!pool2) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const entries = await storage.getGolfPoolEntries(pool2.id);
      const pickDeadlineHours = pool2.pickDeadlineHours || 0;
      const showPicksOverride = pool2.showPicksOverride || false;
      const { week: currentWeek } = getCurrentWeekFromSchedule(pool2.season);
      const deadlineTime = getDeadlineForWeek(pool2.season, currentWeek, pickDeadlineHours);
      const deadlinePassed = hasDeadlinePassed(pool2.season, currentWeek, pickDeadlineHours);
      const shouldReveal = deadlinePassed || showPicksOverride;
      const entriesWithPicks = await Promise.all(
        entries.map(async (entry) => {
          const picks = await storage.getGolfPicks(entry.id);
          const maskedPicks = picks.map((pick) => {
            const shouldMask = pick.weekNumber === currentWeek && !shouldReveal;
            return {
              id: pick.id,
              weekNumber: pick.weekNumber,
              golferName: shouldMask ? "Hidden until deadline" : pick.golferName,
              tournamentName: pick.tournamentName,
              result: pick.result,
              masked: shouldMask
            };
          });
          return {
            id: entry.id,
            entryName: entry.entryName,
            status: entry.status,
            eliminatedWeek: entry.eliminatedWeek,
            picks: maskedPicks
          };
        })
      );
      res.json({
        pool: {
          id: pool2.id,
          name: pool2.name,
          season: pool2.season,
          currentWeek,
          status: pool2.status,
          pickDeadlineHours
        },
        deadlinePassed: shouldReveal,
        deadlineTime: deadlineTime?.toISOString() || null,
        entries: entriesWithPicks
      });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });
  app2.get("/api/golf/pools/:poolId/entries/email/:email", async (req, res) => {
    try {
      const entries = await storage.getGolfPoolEntriesByPoolAndEmail(
        req.params.poolId,
        decodeURIComponent(req.params.email)
      );
      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries by email:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });
  app2.get("/api/earnings-pools", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) return res.status(400).json({ error: "No operator assigned" });
      const pools = await storage.getAllEarningsPools(operatorId);
      res.json(pools);
    } catch (error) {
      console.error("Error fetching earnings pools:", error);
      res.status(500).json({ error: "Failed to fetch earnings pools" });
    }
  });
  app2.get("/api/earnings-pools/:id", isAdmin, async (req, res) => {
    try {
      const pool2 = await storage.getEarningsPool(req.params.id);
      if (!pool2) return res.status(404).json({ error: "Pool not found" });
      res.json(pool2);
    } catch (error) {
      console.error("Error fetching earnings pool:", error);
      res.status(500).json({ error: "Failed to fetch earnings pool" });
    }
  });
  app2.post("/api/earnings-pools", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) return res.status(400).json({ error: "No operator assigned" });
      const parsed = insertEarningsPoolSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }
      const pool2 = await storage.createEarningsPool({ ...parsed.data, operatorId });
      res.json(pool2);
    } catch (error) {
      console.error("Error creating earnings pool:", error);
      res.status(500).json({ error: "Failed to create earnings pool" });
    }
  });
  app2.patch("/api/earnings-pools/:id", isAdmin, async (req, res) => {
    try {
      const pool2 = await storage.updateEarningsPool(req.params.id, req.body);
      if (!pool2) return res.status(404).json({ error: "Pool not found" });
      res.json(pool2);
    } catch (error) {
      console.error("Error updating earnings pool:", error);
      res.status(500).json({ error: "Failed to update earnings pool" });
    }
  });
  app2.delete("/api/earnings-pools/:id", isAdmin, async (req, res) => {
    try {
      stopScoringLoop(req.params.id);
      await storage.deleteEarningsPool(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting earnings pool:", error);
      res.status(500).json({ error: "Failed to delete earnings pool" });
    }
  });
  app2.post("/api/earnings-pools/:id/populate-field", isAdmin, async (req, res) => {
    try {
      const poolId = req.params.id;
      const pool2 = await storage.getEarningsPool(poolId);
      if (!pool2) return res.status(404).json({ error: "Pool not found" });
      const field = await dataGolfService.getCurrentField("pga");
      await storage.deleteEarningsPoolGolfers(poolId);
      const golferInserts = field.golfers.map((g, i) => ({
        poolId,
        dgId: g.dgId,
        name: g.name,
        country: g.country,
        tier: assignTiers(field.golfers.length, i),
        dgRank: g.dgRank,
        owgrRank: g.owgrRank
      }));
      const golfers = await storage.createEarningsPoolGolfers(golferInserts);
      await storage.updateEarningsPool(poolId, {
        tournamentName: field.eventName,
        tournamentDgId: field.eventId
      });
      res.json({ golfers, eventName: field.eventName, totalGolfers: golfers.length });
    } catch (error) {
      console.error("Error populating field:", error);
      res.status(500).json({ error: "Failed to populate field" });
    }
  });
  app2.get("/api/earnings-pools/:id/golfers", async (req, res) => {
    try {
      const golfers = await storage.getEarningsPoolGolfers(req.params.id);
      const tiers = { 1: [], 2: [], 3: [], 4: [] };
      golfers.forEach((g) => {
        if (tiers[g.tier]) tiers[g.tier].push(g);
      });
      res.json({ golfers, tiers });
    } catch (error) {
      console.error("Error fetching golfers:", error);
      res.status(500).json({ error: "Failed to fetch golfers" });
    }
  });
  app2.post("/api/earnings-pools/:id/refresh", isAdmin, async (req, res) => {
    try {
      const rankings = await refreshEarningsPool(req.params.id);
      res.json({ success: true, entryCount: rankings.length });
    } catch (error) {
      console.error("Error refreshing earnings pool:", error);
      res.status(500).json({ error: "Failed to refresh scores" });
    }
  });
  app2.post("/api/earnings-pools/:id/scoring-loop", isAdmin, async (req, res) => {
    try {
      const { action } = req.body;
      if (action === "start") {
        startScoringLoop(req.params.id);
        await storage.updateEarningsPool(req.params.id, { status: "live" });
        res.json({ success: true, message: "Scoring loop started" });
      } else if (action === "stop") {
        stopScoringLoop(req.params.id);
        res.json({ success: true, message: "Scoring loop stopped" });
      } else {
        res.status(400).json({ error: "Invalid action. Use 'start' or 'stop'" });
      }
    } catch (error) {
      console.error("Error managing scoring loop:", error);
      res.status(500).json({ error: "Failed to manage scoring loop" });
    }
  });
  app2.get("/api/earnings-pools/:id/entries", isAdmin, async (req, res) => {
    try {
      const entries = await storage.getEarningsPoolEntries(req.params.id);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });
  app2.delete("/api/earnings-pools/:poolId/entries/:entryId", isAdmin, async (req, res) => {
    try {
      await storage.deleteEarningsPoolEntry(req.params.entryId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting entry:", error);
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });
  app2.post("/api/earnings-pools/:id/entries", async (req, res) => {
    try {
      const poolId = req.params.id;
      const pool2 = await storage.getEarningsPool(poolId);
      if (!pool2) return res.status(404).json({ error: "Pool not found" });
      if (pool2.status !== "open") {
        return res.status(400).json({ error: "This pool is not accepting entries" });
      }
      const { entryName, email, tier1GolferId, tier2GolferId, tier3GolferId, tier4GolferId } = req.body;
      if (!entryName || !email || !tier1GolferId || !tier2GolferId || !tier3GolferId || !tier4GolferId) {
        return res.status(400).json({ error: "All fields are required. Select one golfer from each tier." });
      }
      const existingEntries = await storage.getEarningsPoolEntriesByEmail(poolId, email);
      if (existingEntries.length >= pool2.maxEntriesPerEmail) {
        return res.status(400).json({
          error: `Maximum ${pool2.maxEntriesPerEmail} entry(ies) per email. You already have ${existingEntries.length}.`
        });
      }
      const golfers = await storage.getEarningsPoolGolfers(poolId);
      const golferMap = new Map(golfers.map((g) => [g.id, g]));
      const t1 = golferMap.get(tier1GolferId);
      const t2 = golferMap.get(tier2GolferId);
      const t3 = golferMap.get(tier3GolferId);
      const t4 = golferMap.get(tier4GolferId);
      if (!t1 || t1.tier !== 1) return res.status(400).json({ error: "Invalid Tier 1 selection" });
      if (!t2 || t2.tier !== 2) return res.status(400).json({ error: "Invalid Tier 2 selection" });
      if (!t3 || t3.tier !== 3) return res.status(400).json({ error: "Invalid Tier 3 selection" });
      if (!t4 || t4.tier !== 4) return res.status(400).json({ error: "Invalid Tier 4 selection" });
      const entry = await storage.createEarningsPoolEntry({
        poolId,
        entryName,
        email,
        tier1GolferId,
        tier2GolferId,
        tier3GolferId,
        tier4GolferId
      });
      res.json(entry);
    } catch (error) {
      console.error("Error creating entry:", error);
      res.status(500).json({ error: "Failed to submit entry" });
    }
  });
  app2.get("/api/earnings-pools/:id/scoreboard", async (req, res) => {
    try {
      const pool2 = await storage.getEarningsPool(req.params.id);
      if (!pool2) return res.status(404).json({ error: "Pool not found" });
      res.json({
        pool: {
          id: pool2.id,
          name: pool2.name,
          tournamentName: pool2.tournamentName,
          season: pool2.season,
          status: pool2.status,
          entryFee: pool2.entryFee
        },
        rankings: pool2.rankingsCache || [],
        lastUpdated: pool2.rankingsCacheUpdatedAt?.toISOString() || null
      });
    } catch (error) {
      console.error("Error fetching scoreboard:", error);
      res.status(500).json({ error: "Failed to fetch scoreboard" });
    }
  });
  app2.get("/api/earnings-pools/:id/public", async (req, res) => {
    try {
      const pool2 = await storage.getEarningsPool(req.params.id);
      if (!pool2) return res.status(404).json({ error: "Pool not found" });
      const entryCount = await storage.countEarningsPoolEntries(pool2.id);
      res.json({
        id: pool2.id,
        name: pool2.name,
        tournamentName: pool2.tournamentName,
        season: pool2.season,
        status: pool2.status,
        entryFee: pool2.entryFee,
        notes: pool2.notes,
        maxEntriesPerEmail: pool2.maxEntriesPerEmail,
        entryCount
      });
    } catch (error) {
      console.error("Error fetching public pool info:", error);
      res.status(500).json({ error: "Failed to fetch pool info" });
    }
  });
  app2.get("/api/earnings-pools/public/list", async (req, res) => {
    try {
      const pools = await storage.listEarningsPools();
      const results = await Promise.all(
        pools.map(async (pool2) => {
          const entryCount = await storage.countEarningsPoolEntries(pool2.id);
          return {
            id: pool2.id,
            name: pool2.name,
            slug: pool2.slug,
            tournamentName: pool2.tournamentName,
            season: pool2.season,
            status: pool2.status,
            entryFee: pool2.entryFee,
            entryCount
          };
        })
      );
      res.json(results);
    } catch (error) {
      console.error("Error listing public earnings pools:", error);
      res.status(500).json({ error: "Failed to list pools" });
    }
  });
  app2.get("/api/earnings-pools/by-slug/:slug", async (req, res) => {
    try {
      const pool2 = await storage.getEarningsPoolBySlug(req.params.slug);
      if (!pool2) return res.status(404).json({ error: "Pool not found" });
      res.json(pool2);
    } catch (error) {
      console.error("Error fetching pool by slug:", error);
      res.status(500).json({ error: "Failed to fetch pool" });
    }
  });
  app2.post("/api/seed/football-squares", async (req, res) => {
    try {
      let shuffledDigits2 = function() {
        const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };
      var shuffledDigits = shuffledDigits2;
      let operator = await storage.getOperatorBySlug("south-bay-pools");
      if (!operator) {
        operator = await storage.createOperator({
          name: "South Bay Pools",
          slug: "south-bay-pools",
          plan: "free",
          status: "active",
          maxContests: 10
        });
      }
      const existing = await storage.getContestBySlug("super-bowl-lxi", operator.id);
      if (existing) {
        return res.json({ message: "Contest already exists", contestId: existing.id, slug: "super-bowl-lxi" });
      }
      const redRowsCount = 4;
      const topAxisNumbers = Array.from({ length: redRowsCount }, () => shuffledDigits2());
      const leftAxisNumbers = Array.from({ length: redRowsCount }, () => shuffledDigits2());
      const contest = await storage.createContest({
        operatorId: operator.id,
        name: "Super Bowl LXI Squares",
        slug: "super-bowl-lxi",
        eventDate: /* @__PURE__ */ new Date("2027-02-14"),
        topTeam: "Chiefs",
        leftTeam: "49ers",
        notes: "Test contest - $25 per square. Q1: $250, Q2: $250, Q3: $250, Q4: $750.",
        topAxisNumbers,
        leftAxisNumbers,
        layerLabels: ["Q1", "Q2", "Q3", "Q4"],
        redRowsCount,
        headerColorsEnabled: true,
        layerColors: ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"],
        status: "open",
        prizes: [
          { label: "Q1 Winner", amount: "$250", layerIndex: 0 },
          { label: "Q2 Winner", amount: "$250", layerIndex: 1 },
          { label: "Q3 Winner", amount: "$250", layerIndex: 2 },
          { label: "Q4 / Final Winner", amount: "$750", layerIndex: 3 }
        ],
        winners: []
      });
      const sampleNames = [
        "Mike T.",
        "Sarah J.",
        "Dave R.",
        "Lisa M.",
        "Chris P.",
        "Anna K.",
        "Tom B.",
        "Jenny W.",
        "Rick S.",
        "Nicole H.",
        "Brandon L.",
        "Katie F.",
        "James D.",
        "Megan C.",
        "Steve A."
      ];
      const squaresToCreate = Array.from({ length: 100 }, (_, i) => {
        const index2 = i + 1;
        const row = Math.floor(i / 10);
        const col = i % 10;
        const rand = Math.random();
        if (rand < 0.35) {
          const name = sampleNames[Math.floor(Math.random() * sampleNames.length)];
          return {
            contestId: contest.id,
            index: index2,
            row,
            col,
            status: "taken",
            entryName: name,
            holderName: name,
            holderEmail: `${name.toLowerCase().replace(/[^a-z]/g, "")}@example.com`
          };
        } else if (rand > 0.95) {
          return { contestId: contest.id, index: index2, row, col, status: "disabled" };
        } else {
          return { contestId: contest.id, index: index2, row, col, status: "available" };
        }
      });
      await storage.createSquares(squaresToCreate);
      const takenCount = squaresToCreate.filter((s) => s.status === "taken").length;
      const availableCount = squaresToCreate.filter((s) => s.status === "available").length;
      const disabledCount = squaresToCreate.filter((s) => s.status === "disabled").length;
      res.status(201).json({
        message: "Test Football Squares contest created",
        contestId: contest.id,
        slug: "super-bowl-lxi",
        squares: { taken: takenCount, available: availableCount, disabled: disabledCount }
      });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: "Failed to seed contest" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vercel/index.ts
var app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      console.log(logLine);
    }
  });
  next();
});
app.get("/api/cron/refresh-scores", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { earningsPools: earningsPools3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq3 } = await import("drizzle-orm");
    const { refreshEarningsPool: refreshEarningsPool2 } = await Promise.resolve().then(() => (init_earningsEngine(), earningsEngine_exports));
    const livePools = await db2.select().from(earningsPools3).where(eq3(earningsPools3.status, "live"));
    const results = [];
    for (const pool2 of livePools) {
      try {
        await refreshEarningsPool2(pool2.id);
        results.push({ poolId: pool2.id, status: "refreshed" });
      } catch (error) {
        results.push({ poolId: pool2.id, status: "error", message: error.message });
      }
    }
    return res.json({ refreshed: results.length, results });
  } catch (error) {
    console.error("Cron refresh error:", error);
    return res.status(500).json({ message: error.message });
  }
});
var initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });
    initialized = true;
  }
}
async function handler(req, res) {
  try {
    await ensureInitialized();
    return app(req, res);
  } catch (error) {
    console.error("Handler initialization error:", error);
    res.status(500).json({
      error: error.message,
      code: error.code,
      stack: error.stack?.split("\n").slice(0, 5)
    });
  }
}
export {
  handler as default
};
