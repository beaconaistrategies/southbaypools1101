import { type User, type InsertUser, type Contest, type InsertContest, type Square, type InsertSquare, contests, squares, users } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Contest methods
  getContest(id: string): Promise<Contest | undefined>;
  getAllContests(): Promise<Contest[]>;
  createContest(contest: InsertContest): Promise<Contest>;
  updateContest(id: string, contest: Partial<InsertContest>): Promise<Contest | undefined>;
  deleteContest(id: string): Promise<void>;
  
  // Square methods
  getContestSquares(contestId: string): Promise<Square[]>;
  getSquare(id: string): Promise<Square | undefined>;
  createSquare(square: InsertSquare): Promise<Square>;
  updateSquare(id: string, square: Partial<InsertSquare>): Promise<Square | undefined>;
  createSquares(squares: InsertSquare[]): Promise<Square[]>;
  updateSquareByContestAndIndex(contestId: string, index: number, square: Partial<InsertSquare>): Promise<Square | undefined>;
}

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Contest methods
  async getContest(id: string): Promise<Contest | undefined> {
    const result = await db.select().from(contests).where(eq(contests.id, id)).limit(1);
    return result[0];
  }

  async getAllContests(): Promise<Contest[]> {
    return await db.select().from(contests);
  }

  async createContest(contest: InsertContest): Promise<Contest> {
    const result = await db.insert(contests).values(contest).returning();
    return result[0];
  }

  async updateContest(id: string, contest: Partial<InsertContest>): Promise<Contest | undefined> {
    const result = await db.update(contests).set(contest).where(eq(contests.id, id)).returning();
    return result[0];
  }

  async deleteContest(id: string): Promise<void> {
    await db.delete(contests).where(eq(contests.id, id));
  }

  // Square methods
  async getContestSquares(contestId: string): Promise<Square[]> {
    return await db.select().from(squares).where(eq(squares.contestId, contestId));
  }

  async getSquare(id: string): Promise<Square | undefined> {
    const result = await db.select().from(squares).where(eq(squares.id, id)).limit(1);
    return result[0];
  }

  async createSquare(square: InsertSquare): Promise<Square> {
    const result = await db.insert(squares).values(square).returning();
    return result[0];
  }

  async updateSquare(id: string, square: Partial<InsertSquare>): Promise<Square | undefined> {
    const result = await db.update(squares).set(square).where(eq(squares.id, id)).returning();
    return result[0];
  }

  async createSquares(squaresToCreate: InsertSquare[]): Promise<Square[]> {
    const result = await db.insert(squares).values(squaresToCreate).returning();
    return result;
  }

  async updateSquareByContestAndIndex(contestId: string, index: number, square: Partial<InsertSquare>): Promise<Square | undefined> {
    const result = await db.update(squares)
      .set(square)
      .where(and(eq(squares.contestId, contestId), eq(squares.index, index)))
      .returning();
    return result[0];
  }
}

export const storage = new DbStorage();
