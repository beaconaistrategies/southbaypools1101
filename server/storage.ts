import { type User, type UpsertUser, type Contest, type InsertContest, type Square, type InsertSquare, type Folder, type InsertFolder, type Operator, type InsertOperator, type Participant, type InsertParticipant, type GolfTournament, type InsertGolfTournament, type GolfPool, type InsertGolfPool, type GolfPoolEntry, type InsertGolfPoolEntry, type GolfPick, type InsertGolfPick, type SquareTemplate, type InsertSquareTemplate, type ContestManager, type InsertContestManager, type UserRole, contests, squares, users, folders, operators, participants, golfTournaments, golfPools, golfPoolEntries, golfPicks, squareTemplates, contestManagers } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, asc, desc } from "drizzle-orm";

export interface IStorage {
  // Operator methods
  getOperator(id: string): Promise<Operator | undefined>;
  getOperatorBySlug(slug: string): Promise<Operator | undefined>;
  createOperator(operator: InsertOperator): Promise<Operator>;
  updateOperator(id: string, operator: Partial<InsertOperator>): Promise<Operator | undefined>;

  // User methods for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByOperator(operatorId: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: UserRole): Promise<User | undefined>;
  
  // Contest Manager methods
  getContestManagers(contestId: string): Promise<ContestManager[]>;
  getContestsForManager(userId: string): Promise<ContestManager[]>;
  addContestManager(manager: InsertContestManager): Promise<ContestManager>;
  removeContestManager(userId: string, contestId: string): Promise<void>;
  isContestManager(userId: string, contestId: string): Promise<boolean>;
  
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

  // Golf Tournament methods
  getAllGolfTournaments(season?: number): Promise<GolfTournament[]>;
  getGolfTournament(id: string): Promise<GolfTournament | undefined>;
  createGolfTournament(tournament: InsertGolfTournament): Promise<GolfTournament>;
  updateGolfTournament(id: string, tournament: Partial<InsertGolfTournament>): Promise<GolfTournament | undefined>;
  deleteGolfTournament(id: string): Promise<void>;

  // Golf Pool methods
  getAllGolfPools(operatorId: string): Promise<GolfPool[]>;
  getGolfPool(id: string): Promise<GolfPool | undefined>;
  getGolfPoolBySlug(slug: string, operatorId?: string): Promise<GolfPool | undefined>;
  createGolfPool(pool: InsertGolfPool & { operatorId: string }): Promise<GolfPool>;
  updateGolfPool(id: string, pool: Partial<InsertGolfPool>): Promise<GolfPool | undefined>;
  deleteGolfPool(id: string): Promise<void>;

  // Golf Pool Entry methods
  getGolfPoolEntries(poolId: string): Promise<GolfPoolEntry[]>;
  getGolfPoolEntry(id: string): Promise<GolfPoolEntry | undefined>;
  getGolfPoolEntryByToken(token: string): Promise<GolfPoolEntry | undefined>;
  getGolfPoolEntriesByEmail(email: string): Promise<GolfPoolEntry[]>;
  getGolfPoolEntriesByPoolAndEmail(poolId: string, email: string): Promise<GolfPoolEntry[]>;
  createGolfPoolEntry(entry: InsertGolfPoolEntry): Promise<GolfPoolEntry>;
  updateGolfPoolEntry(id: string, entry: Partial<GolfPoolEntry>): Promise<GolfPoolEntry | undefined>;

  // Golf Pick methods
  getGolfPicks(entryId: string): Promise<GolfPick[]>;
  getGolfPicksForWeek(poolId: string, weekNumber: number): Promise<GolfPick[]>;
  createGolfPick(pick: InsertGolfPick): Promise<GolfPick>;
  updateGolfPick(id: string, pick: Partial<GolfPick>): Promise<GolfPick | undefined>;

  // Square Template methods
  getAllSquareTemplates(operatorId: string): Promise<SquareTemplate[]>;
  getSquareTemplate(id: string): Promise<SquareTemplate | undefined>;
  createSquareTemplate(template: InsertSquareTemplate): Promise<SquareTemplate>;
  deleteSquareTemplate(id: string): Promise<void>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUsersByOperator(operatorId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.operatorId, operatorId));
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
          ...(userData.role !== undefined && { role: userData.role }),
          ...(userData.isAdmin !== undefined && { isAdmin: userData.isAdmin }),
          ...(userData.operatorId !== undefined && { operatorId: userData.operatorId }),
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User | undefined> {
    const isAdmin = role === 'admin' || role === 'super_admin';
    const result = await db.update(users).set({ 
      role, 
      isAdmin, 
      updatedAt: new Date() 
    }).where(eq(users.id, userId)).returning();
    return result[0];
  }

  // Contest Manager methods
  async getContestManagers(contestId: string): Promise<ContestManager[]> {
    return db.select().from(contestManagers).where(eq(contestManagers.contestId, contestId));
  }

  async getContestsForManager(userId: string): Promise<ContestManager[]> {
    return db.select().from(contestManagers).where(eq(contestManagers.userId, userId));
  }

  async addContestManager(manager: InsertContestManager): Promise<ContestManager> {
    const result = await db.insert(contestManagers).values(manager).returning();
    return result[0];
  }

  async removeContestManager(userId: string, contestId: string): Promise<void> {
    await db.delete(contestManagers).where(
      and(eq(contestManagers.userId, userId), eq(contestManagers.contestId, contestId))
    );
  }

  async isContestManager(userId: string, contestId: string): Promise<boolean> {
    const result = await db.select().from(contestManagers).where(
      and(eq(contestManagers.userId, userId), eq(contestManagers.contestId, contestId))
    ).limit(1);
    return result.length > 0;
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

  // Golf Tournament methods
  async getAllGolfTournaments(season?: number): Promise<GolfTournament[]> {
    if (season) {
      return await db.select().from(golfTournaments)
        .where(eq(golfTournaments.season, season))
        .orderBy(asc(golfTournaments.startDate));
    }
    return await db.select().from(golfTournaments).orderBy(asc(golfTournaments.startDate));
  }

  async getGolfTournament(id: string): Promise<GolfTournament | undefined> {
    const result = await db.select().from(golfTournaments).where(eq(golfTournaments.id, id)).limit(1);
    return result[0];
  }

  async createGolfTournament(tournament: InsertGolfTournament): Promise<GolfTournament> {
    const result = await db.insert(golfTournaments).values(tournament).returning();
    return result[0];
  }

  async updateGolfTournament(id: string, tournament: Partial<InsertGolfTournament>): Promise<GolfTournament | undefined> {
    const result = await db.update(golfTournaments).set(tournament).where(eq(golfTournaments.id, id)).returning();
    return result[0];
  }

  async deleteGolfTournament(id: string): Promise<void> {
    await db.delete(golfTournaments).where(eq(golfTournaments.id, id));
  }

  // Golf Pool methods
  async getAllGolfPools(operatorId: string): Promise<GolfPool[]> {
    return await db.select().from(golfPools).where(eq(golfPools.operatorId, operatorId));
  }

  async getGolfPool(id: string): Promise<GolfPool | undefined> {
    const result = await db.select().from(golfPools).where(eq(golfPools.id, id)).limit(1);
    return result[0];
  }

  async getGolfPoolBySlug(slug: string, operatorId?: string): Promise<GolfPool | undefined> {
    if (operatorId) {
      const result = await db.select().from(golfPools)
        .where(and(eq(golfPools.slug, slug), eq(golfPools.operatorId, operatorId)))
        .limit(1);
      return result[0];
    }
    const result = await db.select().from(golfPools).where(eq(golfPools.slug, slug)).limit(1);
    return result[0];
  }

  async createGolfPool(pool: InsertGolfPool & { operatorId: string }): Promise<GolfPool> {
    const result = await db.insert(golfPools).values(pool).returning();
    return result[0];
  }

  async updateGolfPool(id: string, pool: Partial<InsertGolfPool>): Promise<GolfPool | undefined> {
    const result = await db.update(golfPools).set(pool).where(eq(golfPools.id, id)).returning();
    return result[0];
  }

  async deleteGolfPool(id: string): Promise<void> {
    await db.delete(golfPools).where(eq(golfPools.id, id));
  }

  // Golf Pool Entry methods
  async getGolfPoolEntries(poolId: string): Promise<GolfPoolEntry[]> {
    return await db.select().from(golfPoolEntries).where(eq(golfPoolEntries.poolId, poolId));
  }

  async getGolfPoolEntry(id: string): Promise<GolfPoolEntry | undefined> {
    const result = await db.select().from(golfPoolEntries).where(eq(golfPoolEntries.id, id)).limit(1);
    return result[0];
  }

  async getGolfPoolEntryByToken(token: string): Promise<GolfPoolEntry | undefined> {
    const result = await db.select().from(golfPoolEntries).where(eq(golfPoolEntries.manageToken, token)).limit(1);
    return result[0];
  }

  async getGolfPoolEntriesByEmail(email: string): Promise<GolfPoolEntry[]> {
    return await db.select().from(golfPoolEntries).where(eq(golfPoolEntries.email, email));
  }

  async getGolfPoolEntriesByPoolAndEmail(poolId: string, email: string): Promise<GolfPoolEntry[]> {
    return await db.select().from(golfPoolEntries)
      .where(and(eq(golfPoolEntries.poolId, poolId), eq(golfPoolEntries.email, email)));
  }

  async createGolfPoolEntry(entry: InsertGolfPoolEntry): Promise<GolfPoolEntry> {
    const result = await db.insert(golfPoolEntries).values(entry).returning();
    return result[0];
  }

  async updateGolfPoolEntry(id: string, entry: Partial<GolfPoolEntry>): Promise<GolfPoolEntry | undefined> {
    const result = await db.update(golfPoolEntries).set(entry).where(eq(golfPoolEntries.id, id)).returning();
    return result[0];
  }

  // Golf Pick methods
  async getGolfPicks(entryId: string): Promise<GolfPick[]> {
    return await db.select().from(golfPicks).where(eq(golfPicks.entryId, entryId)).orderBy(asc(golfPicks.weekNumber));
  }

  async getGolfPicksForWeek(poolId: string, weekNumber: number): Promise<GolfPick[]> {
    return await db.select().from(golfPicks)
      .where(and(eq(golfPicks.poolId, poolId), eq(golfPicks.weekNumber, weekNumber)));
  }

  async createGolfPick(pick: InsertGolfPick): Promise<GolfPick> {
    const result = await db.insert(golfPicks).values(pick).returning();
    return result[0];
  }

  async updateGolfPick(id: string, pick: Partial<GolfPick>): Promise<GolfPick | undefined> {
    const result = await db.update(golfPicks).set(pick).where(eq(golfPicks.id, id)).returning();
    return result[0];
  }

  // Square Template methods
  async getAllSquareTemplates(operatorId: string): Promise<SquareTemplate[]> {
    return await db.select().from(squareTemplates).where(eq(squareTemplates.operatorId, operatorId)).orderBy(asc(squareTemplates.name));
  }

  async getSquareTemplate(id: string): Promise<SquareTemplate | undefined> {
    const result = await db.select().from(squareTemplates).where(eq(squareTemplates.id, id)).limit(1);
    return result[0];
  }

  async createSquareTemplate(template: InsertSquareTemplate): Promise<SquareTemplate> {
    const result = await db.insert(squareTemplates).values(template).returning();
    return result[0];
  }

  async deleteSquareTemplate(id: string): Promise<void> {
    await db.delete(squareTemplates).where(eq(squareTemplates.id, id));
  }
}

export const storage = new DbStorage();
