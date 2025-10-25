import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const contests = pgTable("contests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  eventDate: timestamp("event_date").notNull(),
  topTeam: text("top_team").notNull(),
  leftTeam: text("left_team").notNull(),
  notes: text("notes"),
  topAxisNumbers: integer("top_axis_numbers").array().notNull(),
  leftAxisNumbers: integer("left_axis_numbers").array().notNull(),
  redRowsCount: integer("red_rows_count").notNull().default(2),
  status: text("status").notNull().default("open"),
  q1Winner: text("q1_winner"),
  q2Winner: text("q2_winner"),
  q3Winner: text("q3_winner"),
  q4Winner: text("q4_winner"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertContestSchema = createInsertSchema(contests).omit({
  id: true,
  createdAt: true,
});

export type InsertContest = z.infer<typeof insertContestSchema>;
export type Contest = typeof contests.$inferSelect;

export const squares = pgTable("squares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contestId: varchar("contest_id").notNull().references(() => contests.id, { onDelete: "cascade" }),
  index: integer("index").notNull(),
  row: integer("row").notNull(),
  col: integer("col").notNull(),
  status: text("status").notNull().default("available"),
  entryName: text("entry_name"),
  holderName: text("holder_name"),
  holderEmail: text("holder_email"),
});

export const insertSquareSchema = createInsertSchema(squares).omit({
  id: true,
});

export type InsertSquare = z.infer<typeof insertSquareSchema>;
export type Square = typeof squares.$inferSelect;
