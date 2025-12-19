import { type User, type UpsertUser, type Contest, type InsertContest, type Square, type InsertSquare, type Folder, type InsertFolder, type Operator, type InsertOperator, type Participant, type InsertParticipant, contests, squares, users, folders, operators, participants } from "@shared/schema";
import { db } from "./db";
import { eq, and, or } from "drizzle-orm";

export interface IStorage {
  // Operator methods
  getOperator(id: string): Promise<Operator | undefined>;
  getOperatorBySlug(slug: string): Promise<Operator | undefined>;
  createOperator(operator: InsertOperator): Promise<Operator>;
  updateOperator(id: string, operator: Partial<InsertOperator>): Promise<Operator | undefined>;

  // User methods for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Participant methods (master accounts for pool participants)
  getParticipant(id: string): Promise<Participant | undefined>;
  getParticipantByAuthId(authId: string): Promise<Participant | undefined>;
  getParticipantByEmail(email: string): Promise<Participant | undefined>;
  upsertParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipantContests(participantId: string): Promise<{ contest: Contest; squares: Square[] }[]>;
  
  // Folder methods (operator-scoped)
  getAllFolders(operatorId: string): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  
  // Contest methods (operator-scoped)
  getContest(id: string): Promise<Contest | undefined>;
  getContestBySlug(slug: string, operatorId?: string): Promise<Contest | undefined>;
  getAllContests(operatorId: string): Promise<Contest[]>;
  getAllContestsGlobal(): Promise<Contest[]>;
  createContest(contest: InsertContest & { operatorId: string }): Promise<Contest>;
  updateContest(id: string, contest: Partial<InsertContest>): Promise<Contest | undefined>;
  deleteContest(id: string): Promise<void>;
  countContestsByOperator(operatorId: string): Promise<number>;
  
  // Square methods
  getContestSquares(contestId: string): Promise<Square[]>;
  getSquare(id: string): Promise<Square | undefined>;
  createSquare(square: InsertSquare): Promise<Square>;
  updateSquare(id: string, square: Partial<InsertSquare>): Promise<Square | undefined>;
  createSquares(squares: InsertSquare[]): Promise<Square[]>;
  updateSquareByContestAndIndex(contestId: string, index: number, square: Partial<InsertSquare>): Promise<Square | undefined>;
}

export class DbStorage implements IStorage {
  // Operator methods
  async getOperator(id: string): Promise<Operator | undefined> {
    const result = await db.select().from(operators).where(eq(operators.id, id)).limit(1);
    return result[0];
  }

  async getOperatorBySlug(slug: string): Promise<Operator | undefined> {
    const result = await db.select().from(operators).where(eq(operators.slug, slug)).limit(1);
    return result[0];
  }

  async createOperator(operator: InsertOperator): Promise<Operator> {
    const result = await db.insert(operators).values(operator).returning();
    return result[0];
  }

  async updateOperator(id: string, operator: Partial<InsertOperator>): Promise<Operator | undefined> {
    const result = await db.update(operators).set({
      ...operator,
      updatedAt: new Date(),
    }).where(eq(operators.id, id)).returning();
    return result[0];
  }

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
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          ...(userData.isAdmin !== undefined && { isAdmin: userData.isAdmin }),
          ...(userData.operatorId !== undefined && { operatorId: userData.operatorId }),
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  // Participant methods (master accounts for pool participants)
  async getParticipant(id: string): Promise<Participant | undefined> {
    const result = await db.select().from(participants).where(eq(participants.id, id)).limit(1);
    return result[0];
  }

  async getParticipantByAuthId(authId: string): Promise<Participant | undefined> {
    const result = await db.select().from(participants).where(eq(participants.authId, authId)).limit(1);
    return result[0];
  }

  async getParticipantByEmail(email: string): Promise<Participant | undefined> {
    const result = await db.select().from(participants).where(eq(participants.email, email)).limit(1);
    return result[0];
  }

  async upsertParticipant(participantData: InsertParticipant): Promise<Participant> {
    // Try to find by authId first, then by email
    if (participantData.authId) {
      const existing = await this.getParticipantByAuthId(participantData.authId);
      if (existing) {
        const result = await db.update(participants).set({
          ...participantData,
          updatedAt: new Date(),
        }).where(eq(participants.id, existing.id)).returning();
        return result[0];
      }
    }
    
    // Check if email already exists
    const existingByEmail = await this.getParticipantByEmail(participantData.email);
    if (existingByEmail) {
      // Update with authId if we have one now
      const result = await db.update(participants).set({
        ...participantData,
        updatedAt: new Date(),
      }).where(eq(participants.id, existingByEmail.id)).returning();
      return result[0];
    }
    
    // Create new participant
    const result = await db.insert(participants).values(participantData).returning();
    return result[0];
  }

  async getParticipantContests(participantId: string): Promise<{ contest: Contest; squares: Square[] }[]> {
    // Get all squares for this participant
    const participantSquares = await db.select().from(squares).where(eq(squares.participantId, participantId));
    
    // Group by contest
    const contestIds = Array.from(new Set(participantSquares.map(s => s.contestId)));
    const result: { contest: Contest; squares: Square[] }[] = [];
    
    for (const contestId of contestIds) {
      const contest = await this.getContest(contestId);
      if (contest) {
        const contestSquares = participantSquares.filter(s => s.contestId === contestId);
        result.push({ contest, squares: contestSquares });
      }
    }
    
    return result;
  }

  // Folder methods (operator-scoped)
  async getAllFolders(operatorId: string): Promise<Folder[]> {
    return await db.select().from(folders).where(eq(folders.operatorId, operatorId));
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

  // Contest methods (operator-scoped)
  async getContest(id: string): Promise<Contest | undefined> {
    const result = await db.select().from(contests).where(eq(contests.id, id)).limit(1);
    return result[0];
  }

  async getContestBySlug(slug: string, operatorId?: string): Promise<Contest | undefined> {
    if (operatorId) {
      const result = await db.select().from(contests)
        .where(and(eq(contests.slug, slug), eq(contests.operatorId, operatorId)))
        .limit(1);
      return result[0];
    }
    const result = await db.select().from(contests).where(eq(contests.slug, slug)).limit(1);
    return result[0];
  }

  async getAllContests(operatorId: string): Promise<Contest[]> {
    return await db.select().from(contests).where(eq(contests.operatorId, operatorId));
  }

  async getAllContestsGlobal(): Promise<Contest[]> {
    return await db.select().from(contests);
  }

  async createContest(contest: InsertContest & { operatorId: string }): Promise<Contest> {
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

  async countContestsByOperator(operatorId: string): Promise<number> {
    const result = await db.select().from(contests).where(eq(contests.operatorId, operatorId));
    return result.length;
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
