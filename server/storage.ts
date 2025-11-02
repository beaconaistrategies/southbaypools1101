import { type User, type UpsertUser, type Contest, type InsertContest, type Square, type InsertSquare, type Folder, type InsertFolder, contests, squares, users, folders } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Folder methods
  getAllFolders(): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  
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
  // User methods for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  // Folder methods
  async getAllFolders(): Promise<Folder[]> {
    return await db.select().from(folders);
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const result = await db.select().from(folders).where(eq(folders.id, id)).limit(1);
    return result[0];
  }

  async createFolder(folder: InsertFolder): Promise<Folder> {
    const result = await db.insert(folders).values(folder).returning();
    return result[0];
  }

  async deleteFolder(id: string): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
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
