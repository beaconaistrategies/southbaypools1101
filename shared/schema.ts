import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums for type safety
export const contestStatusEnum = pgEnum("contest_status", ["open", "locked"]);
export const squareStatusEnum = pgEnum("square_status", ["available", "taken", "disabled"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
  createdAt: true,
});

export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;

export const contests = pgTable("contests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
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
  status: contestStatusEnum("status").notNull().default("open"),
  prizes: jsonb("prizes").$type<Prize[]>().default(sql`'[]'::jsonb`),
  winners: jsonb("winners").$type<Winner[]>().default(sql`'[]'::jsonb`),
  q1Winner: text("q1_winner"),
  q2Winner: text("q2_winner"),
  q3Winner: text("q3_winner"),
  q4Winner: text("q4_winner"),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

const baseContestSchema = createInsertSchema(contests).omit({
  id: true,
  createdAt: true,
}).extend({
  topAxisNumbers: z.array(z.array(z.number().min(0).max(9)).length(10)),
  leftAxisNumbers: z.array(z.array(z.number().min(0).max(9)).length(10)),
  layerLabels: z.array(z.string()).optional(),
  redRowsCount: z.number().min(1).max(6),
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
