import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContestSchema, updateContestSchema, updateSquareSchema, insertFolderSchema, insertGolfTournamentSchema, insertGolfPoolSchema, insertGolfPoolEntrySchema, insertGolfPickSchema } from "@shared/schema";
import { z } from "zod";
import { sendWebhookNotification } from "./webhook";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";

// Helper to get operatorId from authenticated request
async function getOperatorId(req: Request): Promise<string | null> {
  const user = (req as any).user;
  if (!user?.claims?.sub) return null;
  const dbUser = await storage.getUser(user.claims.sub);
  return dbUser?.operatorId || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Also return operator info
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
  // Contest routes
  
  // Get all contests with square counts (operator-scoped for authenticated users)
  app.get("/api/contests", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      
      const contests = await storage.getAllContests(operatorId);
      
      // Fetch square counts for all contests in parallel
      const contestsWithCounts = await Promise.all(
        contests.map(async (contest) => {
          const squares = await storage.getContestSquares(contest.id);
          const takenCount = squares.filter(s => s.status === "taken").length;
          return {
            ...contest,
            takenSquares: takenCount,
            totalSquares: squares.length,
          };
        })
      );
      
      res.json(contestsWithCounts);
    } catch (error) {
      console.error("Error fetching contests:", error);
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });

  // Get a single contest by ID or slug
  // ID lookups (UUID format) work globally since IDs are unique
  // Slug lookups: If no operator specified, check the primary operator (south-bay-pools) first
  // Otherwise, use ?operator=<operatorSlug> parameter for disambiguation
  app.get("/api/contests/:identifier", async (req, res) => {
    try {
      const identifier = req.params.identifier;
      const operatorSlug = req.query.operator as string | undefined;
      
      // Check if identifier looks like a UUID (ID lookup)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuidLookup = uuidPattern.test(identifier);
      
      let contest: any = null;
      
      if (isUuidLookup) {
        // Direct ID lookup - IDs are globally unique
        contest = await storage.getContest(identifier);
      } else if (operatorSlug) {
        // Explicit operator context provided
        const operator = await storage.getOperatorBySlug(operatorSlug);
        if (!operator) {
          return res.status(404).json({ error: "Operator not found" });
        }
        contest = await storage.getContestBySlug(identifier, operator.id);
      } else {
        // No operator context - try the primary operator (south-bay-pools) first
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

  // Create a contest with initial squares (admin only)
  app.post("/api/contests", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      
      // Check contest limits
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
      
      // Validate contest data
      const contestData = insertContestSchema.parse({
        ...req.body,
        eventDate: new Date(req.body.eventDate),
      });
      
      // Create the contest with operatorId
      const contest = await storage.createContest({ ...contestData, operatorId });
      
      // Get available squares and reserved squares from request body
      const availableSquares = req.body.availableSquares || Array.from({ length: 100 }, (_, i) => i + 1);
      const reservedSquares: Array<{
        squareNumber: number;
        entryName: string;
        holderName: string;
        holderEmail: string;
      }> = req.body.reservedSquares || [];
      
      // Create a map of reserved squares for quick lookup
      const reservedMap = new Map(
        reservedSquares.map(r => [r.squareNumber, r])
      );
      
      // Create initial squares for the contest
      const squaresToCreate = Array.from({ length: 100 }, (_, i) => {
        const index = i + 1;
        const reserved = reservedMap.get(index);
        
        if (reserved) {
          // This square is reserved with participant info
          return {
            contestId: contest.id,
            index,
            row: Math.floor(i / 10),
            col: i % 10,
            status: "taken" as const,
            entryName: reserved.entryName,
            holderName: reserved.holderName,
            holderEmail: reserved.holderEmail,
          };
        } else {
          // Normal square (available or disabled)
          return {
            contestId: contest.id,
            index,
            row: Math.floor(i / 10),
            col: i % 10,
            status: availableSquares.includes(index) ? ("available" as const) : ("disabled" as const),
          };
        }
      });
      
      await storage.createSquares(squaresToCreate);
      
      // Send webhook notifications for reserved squares
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
            eventDate: contest.eventDate.toISOString(),
          }).catch(err => console.error("Webhook notification failed:", err));
        }
      }
      
      res.status(201).json(contest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("POST /api/contests - Zod validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Invalid contest data", details: error.errors });
      }
      console.error("Error creating contest:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({ error: "Failed to create contest" });
    }
  });

  // Update a contest (admin only)
  app.patch("/api/contests/:id", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      
      const contestId = req.params.id;
      
      // Verify contest belongs to operator
      const existingContest = await storage.getContest(contestId);
      if (!existingContest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      if (existingContest.operatorId !== operatorId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Convert eventDate if present
      const bodyWithDate = req.body.eventDate 
        ? { ...req.body, eventDate: new Date(req.body.eventDate) }
        : req.body;
      
      // Validate update data
      const updateData = updateContestSchema.parse(bodyWithDate);
      
      const contest = await storage.updateContest(contestId, updateData);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      
      // Only handle reserved squares if explicitly provided in the request body
      // This prevents accidental webhooks when updating other contest fields (like showRedHeaders)
      if (req.body.reservedSquares !== undefined) {
        const reservedSquares: Array<{
          squareNumber: number;
          entryName: string;
          holderName: string;
          holderEmail: string;
        }> = req.body.reservedSquares;
        
        // Get current squares to see which ones need to be updated
        const currentSquares = await storage.getContestSquares(contestId);
        const newReservations: typeof reservedSquares = [];
        
        // Find currently reserved squares (that were pre-assigned)
        const currentlyReservedSquares = currentSquares.filter(
          s => s.status === "taken" && s.entryName && s.holderName && s.holderEmail
        );
        
        // Create a set of square numbers that should be reserved
        const reservedSquareNumbers = new Set(reservedSquares.map(r => r.squareNumber));
        
        // Handle removed reservations - make them available again
        for (const currentReserved of currentlyReservedSquares) {
          if (!reservedSquareNumbers.has(currentReserved.index)) {
            // This square was reserved before but is no longer in the list - make it available
            await storage.updateSquare(currentReserved.id, {
              status: "available",
              entryName: null,
              holderName: null,
              holderEmail: null,
            });
          }
        }
        
        // Handle new or updated reservations
        for (const reserved of reservedSquares) {
          const existingSquare = currentSquares.find(s => s.index === reserved.squareNumber);
          
          if (existingSquare) {
            // Only update if the square isn't already taken with this exact info
            const isAlreadyReserved = 
              existingSquare.status === "taken" &&
              existingSquare.entryName === reserved.entryName &&
              existingSquare.holderName === reserved.holderName &&
              existingSquare.holderEmail === reserved.holderEmail;
            
            if (!isAlreadyReserved) {
              // Update the square to be taken with participant info
              await storage.updateSquare(existingSquare.id, {
                status: "taken",
                entryName: reserved.entryName,
                holderName: reserved.holderName,
                holderEmail: reserved.holderEmail,
              });
              
              // Track this as a new reservation for webhook
              newReservations.push(reserved);
            }
          }
        }
        
        // Send webhook notifications for new reservations only
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
              eventDate: contest.eventDate.toISOString(),
            }).catch(err => console.error("Webhook notification failed:", err));
          }
        }
      }
      
      res.json(contest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating contest:", error);
      res.status(500).json({ error: "Failed to update contest" });
    }
  });

  // Delete a contest (admin only)
  app.delete("/api/contests/:id", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      
      // Verify contest belongs to operator
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

  // Clone a contest (admin only)
  app.post("/api/contests/:id/clone", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      
      const originalContest = await storage.getContest(req.params.id);
      if (!originalContest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      
      // Verify contest belongs to operator
      if (originalContest.operatorId !== operatorId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Create new contest with cloned settings
      const clonedContestData = insertContestSchema.parse({
        name: req.body.name || `${originalContest.name} (Copy)`,
        topTeam: originalContest.topTeam,
        leftTeam: originalContest.leftTeam,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : new Date(),
        status: "open",
        topAxisNumbers: originalContest.topAxisNumbers,
        leftAxisNumbers: originalContest.leftAxisNumbers,
        layerLabels: originalContest.layerLabels,
        showRedHeaders: false,
        prizes: originalContest.prizes,
        winners: [],
        webhookUrl: originalContest.webhookUrl,
      });

      const clonedContest = await storage.createContest({ ...clonedContestData, operatorId });

      // Create fresh squares for the cloned contest
      const squaresToCreate = Array.from({ length: 100 }, (_, i) => ({
        contestId: clonedContest.id,
        index: i + 1,
        row: Math.floor(i / 10),
        col: i % 10,
        status: "available" as const,
      }));

      await storage.createSquares(squaresToCreate);

      res.status(201).json(clonedContest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid clone data", details: error.errors });
      }
      console.error("Error cloning contest:", error);
      res.status(500).json({ error: "Failed to clone contest" });
    }
  });

  // Get contests by participant email (searches across all operators)
  app.get("/api/my-contests/:email", async (req, res) => {
    try {
      const email = req.params.email.toLowerCase().trim();
      const contests = await storage.getAllContestsGlobal();
      const participations: Array<{
        contestId: string;
        contestName: string;
        eventDate: Date;
        topTeam: string;
        leftTeam: string;
        squareNumber: number;
        entryName: string;
      }> = [];

      // Find all squares claimed by this email across all contests
      for (const contest of contests) {
        const squares = await storage.getContestSquares(contest.id);
        const userSquares = squares.filter(
          s => s.holderEmail?.toLowerCase() === email && s.status === "taken"
        );

        userSquares.forEach(square => {
          participations.push({
            contestId: contest.id,
            contestName: contest.name,
            eventDate: contest.eventDate,
            topTeam: contest.topTeam,
            leftTeam: contest.leftTeam,
            squareNumber: square.index,
            entryName: square.entryName || "",
          });
        });
      }

      // Sort by event date (most recent first)
      participations.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

      res.json(participations);
    } catch (error) {
      console.error("Error fetching user contests:", error);
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });

  // Test webhook endpoint
  app.post("/api/contests/:id/test-webhook", async (req, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      if (!contest.webhookUrl) {
        return res.status(400).json({ error: "No webhook URL configured" });
      }

      // Send test webhook with sample data
      const testData = {
        contestName: contest.name,
        contestId: contest.id,
        entryName: "Test Entry",
        holderEmail: "test@example.com",
        holderName: "Test User",
        squareNumber: 1,
        topTeam: contest.topTeam,
        leftTeam: contest.leftTeam,
        eventDate: contest.eventDate.toISOString(),
      };

      const response = await fetch(contest.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "test_webhook",
          timestamp: new Date().toISOString(),
          data: testData,
        }),
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

  // Square routes
  
  // Get squares for a contest
  app.get("/api/contests/:id/squares", async (req, res) => {
    try {
      const squares = await storage.getContestSquares(req.params.id);
      res.json(squares);
    } catch (error) {
      console.error("Error fetching squares:", error);
      res.status(500).json({ error: "Failed to fetch squares" });
    }
  });

  // Update a square by contest ID and index (for claiming a square)
  app.patch("/api/contests/:contestId/squares/:index", async (req: any, res) => {
    try {
      const index = parseInt(req.params.index);
      
      // Validate update data
      const updateData = updateSquareSchema.parse(req.body);
      
      // If user is signed in and claim email matches, link their participant account
      let participantId: string | undefined;
      if (req.user?.claims?.sub && updateData.status === "taken" && updateData.holderEmail) {
        const authId = req.user.claims.sub;
        const sessionEmail = req.user.claims.email?.toLowerCase();
        const claimEmail = updateData.holderEmail?.toLowerCase();
        
        // Only link if the claim email matches the signed-in user's email
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
        index,
        { ...updateData, participantId }
      );
      
      if (!square) {
        return res.status(404).json({ error: "Square not found" });
      }

      // If a square was just claimed, send webhook notification
      if (square.status === "taken" && square.holderEmail && square.entryName) {
        const contest = await storage.getContest(req.params.contestId);
        if (contest?.webhookUrl) {
          // Fire and forget - don't await
          sendWebhookNotification(contest.webhookUrl, {
            contestName: contest.name,
            contestId: contest.id,
            entryName: square.entryName,
            holderEmail: square.holderEmail,
            holderName: square.holderName || square.entryName,
            squareNumber: square.index,
            topTeam: contest.topTeam,
            leftTeam: contest.leftTeam,
            eventDate: contest.eventDate.toISOString(),
          }).catch(err => console.error("Webhook notification failed:", err));
        }
      }
      
      res.json(square);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating square:", error);
      res.status(500).json({ error: "Failed to update square" });
    }
  });

  // Random square assignment
  app.post("/api/contests/:id/squares/random", async (req: any, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      if (contest.status === "locked") {
        return res.status(400).json({ error: "Contest is locked" });
      }

      // Get all available squares
      const squares = await storage.getContestSquares(req.params.id);
      const availableSquares = squares.filter(s => s.status === "available");

      if (availableSquares.length === 0) {
        return res.status(400).json({ error: "No available squares" });
      }

      // Pick a random available square
      const randomSquare = availableSquares[Math.floor(Math.random() * availableSquares.length)];

      // Validate participant data
      const schema = z.object({
        holderName: z.string().min(1),
        holderEmail: z.string().email(),
        entryName: z.string().min(1),
      });
      const participantData = schema.parse(req.body);

      // If user is signed in and claim email matches, link their participant account
      let participantId: string | undefined;
      if (req.user?.claims?.sub) {
        const authId = req.user.claims.sub;
        const sessionEmail = req.user.claims.email?.toLowerCase();
        const claimEmail = participantData.holderEmail?.toLowerCase();
        
        // Only link if the claim email matches the signed-in user's email
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

      // Claim the random square
      const claimedSquare = await storage.updateSquareByContestAndIndex(
        req.params.id,
        randomSquare.index,
        {
          status: "taken",
          ...participantData,
          participantId,
        }
      );

      if (!claimedSquare) {
        return res.status(500).json({ error: "Failed to claim square" });
      }

      // Send webhook notification
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
          eventDate: contest.eventDate.toISOString(),
        }).catch(err => console.error("Webhook notification failed:", err));
      }

      res.json({
        squareNumber: claimedSquare.index,
        entryName: participantData.entryName,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid participant data", details: error.errors });
      }
      console.error("Error assigning random square:", error);
      res.status(500).json({ error: "Failed to assign random square" });
    }
  });

  // Folder routes
  
  // Get all folders (operator-scoped)
  app.get("/api/folders", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      
      const folders = await storage.getAllFolders(operatorId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  // Create a folder (admin only)
  app.post("/api/folders", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      
      const folderData = insertFolderSchema.parse(req.body);
      const folder = await storage.createFolder({ ...folderData, operatorId });
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid folder data", details: error.errors });
      }
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  // Delete a folder (admin only)
  app.delete("/api/folders/:id", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      
      // Verify folder belongs to operator
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

  // ========== PARTICIPANT HUB ROUTES ==========
  
  // Get all public contests for the hub (no auth required)
  app.get("/api/public/contests", async (req, res) => {
    try {
      const allContests = await storage.getAllContestsGlobal();
      
      // Get square counts and filter to open contests only
      const publicContests = await Promise.all(
        allContests
          .filter(c => c.status === "open")
          .map(async (contest) => {
            const squares = await storage.getContestSquares(contest.id);
            const takenCount = squares.filter(s => s.status === "taken").length;
            const availableCount = squares.filter(s => s.status === "available").length;
            
            // Get operator info for URL building
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
              totalSquares: squares.length,
              operatorSlug,
            };
          })
      );
      
      // Sort by event date (upcoming first)
      publicContests.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
      
      res.json(publicContests);
    } catch (error) {
      console.error("Error fetching public contests:", error);
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });

  // Get logged-in participant info
  app.get("/api/participant/user", isAuthenticated, async (req: any, res) => {
    try {
      const authId = req.user.claims.sub;
      const email = req.user.claims.email;
      
      if (!authId) {
        return res.status(401).json({ message: "No auth ID found" });
      }
      
      // Find participant by authId first
      let participant = await storage.getParticipantByAuthId(authId);
      
      if (participant) {
        // Already exists - return it
        return res.json(participant);
      }
      
      // Not found by authId - check by email
      if (email) {
        participant = await storage.getParticipantByEmail(email);
        if (participant) {
          // Link their auth ID to existing email-based account
          participant = await storage.upsertParticipant({
            ...participant,
            authId,
          });
          return res.json(participant);
        }
      }
      
      // No existing participant - create new one
      if (!email) {
        return res.status(400).json({ message: "Email required to create participant" });
      }
      
      participant = await storage.upsertParticipant({
        authId,
        email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
      });
      
      return res.json(participant);
    } catch (error) {
      console.error("Error fetching participant:", error);
      res.status(500).json({ message: "Failed to fetch participant" });
    }
  });

  // Get participant's contests (uses email-based lookup for simplicity)
  app.get("/api/participant/contests", isAuthenticated, async (req: any, res) => {
    try {
      const email = req.user.claims.email;
      
      if (!email) {
        return res.json([]);
      }
      
      // Find all squares claimed by this email across all contests
      const allContests = await storage.getAllContestsGlobal();
      const entries: Array<{
        contestId: string;
        contestName: string;
        contestSlug: string | null;
        eventDate: Date;
        topTeam: string;
        leftTeam: string;
        status: string;
        squareCount: number;
        squares: Array<{ index: number; entryName: string | null }>;
      }> = [];
      
      for (const contest of allContests) {
        const squares = await storage.getContestSquares(contest.id);
        const userSquares = squares.filter(
          s => s.holderEmail?.toLowerCase() === email.toLowerCase() && s.status === "taken"
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
            squares: userSquares.map(s => ({
              index: s.index,
              entryName: s.entryName,
            })),
          });
        }
      }
      
      // Sort by event date (recent first)
      entries.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
      
      return res.json(entries);
    } catch (error) {
      console.error("Error fetching participant contests:", error);
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });

  // Export contest to CSV
  app.get("/api/contests/:id/export-csv", async (req, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      
      const squares = await storage.getContestSquares(contest.id);
      
      // Build CSV header
      const csvRows = [];
      csvRows.push("Square Number,Row,Column,Status,Entry Name,Holder Name,Holder Email");
      
      // Add square data
      for (const square of squares) {
        csvRows.push(
          `${square.index},${square.row},${square.col},${square.status},"${square.entryName || ''}","${square.holderName || ''}","${square.holderEmail || ''}"`
        );
      }
      
      const csv = csvRows.join("\n");
      
      // Set headers for download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="contest-${contest.id}-export.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting contest to CSV:", error);
      res.status(500).json({ error: "Failed to export contest" });
    }
  });

  // ==========================================
  // GOLF SURVIVOR ROUTES
  // ==========================================

  // Golf Tournament routes (admin only for management, public for viewing)
  app.get("/api/golf/tournaments", async (req, res) => {
    try {
      const season = req.query.season ? parseInt(req.query.season as string) : undefined;
      const tournaments = await storage.getAllGolfTournaments(season);
      return res.json(tournaments);
    } catch (error) {
      console.error("Error fetching golf tournaments:", error);
      return res.status(500).json({ error: "Failed to fetch tournaments" });
    }
  });

  app.get("/api/golf/tournaments/:id", async (req, res) => {
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

  app.post("/api/golf/tournaments", isAdmin, async (req, res) => {
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

  // Bulk import tournaments (admin only)
  app.post("/api/golf/tournaments/bulk", isAdmin, async (req, res) => {
    try {
      const tournaments = req.body.tournaments as Array<{
        name: string;
        startDate: string;
        endDate: string;
        season: number;
        weekNumber?: number;
      }>;
      
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
          weekNumber: t.weekNumber,
        });
        created.push(tournament);
      }
      
      return res.json({ created: created.length, tournaments: created });
    } catch (error) {
      console.error("Error bulk importing tournaments:", error);
      return res.status(500).json({ error: "Failed to import tournaments" });
    }
  });

  app.patch("/api/golf/tournaments/:id", isAdmin, async (req, res) => {
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

  app.delete("/api/golf/tournaments/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteGolfTournament(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tournament:", error);
      return res.status(500).json({ error: "Failed to delete tournament" });
    }
  });

  // Golf Pool routes (admin for management)
  app.get("/api/golf/pools", isAdmin, async (req, res) => {
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

  app.get("/api/golf/pools/:id", async (req, res) => {
    try {
      const pool = await storage.getGolfPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }
      const entries = await storage.getGolfPoolEntries(req.params.id);
      return res.json({ ...pool, entries });
    } catch (error) {
      console.error("Error fetching pool:", error);
      return res.status(500).json({ error: "Failed to fetch pool" });
    }
  });

  app.post("/api/golf/pools", isAdmin, async (req, res) => {
    try {
      const operatorId = await getOperatorId(req);
      if (!operatorId) {
        return res.status(403).json({ error: "No operator assigned" });
      }
      
      const validation = insertGolfPoolSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const pool = await storage.createGolfPool({ ...validation.data, operatorId });
      return res.json(pool);
    } catch (error) {
      console.error("Error creating pool:", error);
      return res.status(500).json({ error: "Failed to create pool" });
    }
  });

  app.patch("/api/golf/pools/:id", isAdmin, async (req, res) => {
    try {
      const pool = await storage.updateGolfPool(req.params.id, req.body);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }
      return res.json(pool);
    } catch (error) {
      console.error("Error updating pool:", error);
      return res.status(500).json({ error: "Failed to update pool" });
    }
  });

  app.delete("/api/golf/pools/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteGolfPool(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pool:", error);
      return res.status(500).json({ error: "Failed to delete pool" });
    }
  });

  // Golf Pool Entry routes
  app.get("/api/golf/pools/:poolId/entries", async (req, res) => {
    try {
      const entries = await storage.getGolfPoolEntries(req.params.poolId);
      return res.json(entries);
    } catch (error) {
      console.error("Error fetching pool entries:", error);
      return res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.post("/api/golf/pools/:poolId/entries", isAdmin, async (req, res) => {
    try {
      const pool = await storage.getGolfPool(req.params.poolId);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }
      
      const validation = insertGolfPoolEntrySchema.safeParse({
        ...req.body,
        poolId: req.params.poolId,
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

  app.patch("/api/golf/entries/:id", isAdmin, async (req, res) => {
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

  // Golf Pick routes
  app.get("/api/golf/entries/:entryId/picks", async (req, res) => {
    try {
      const picks = await storage.getGolfPicks(req.params.entryId);
      return res.json(picks);
    } catch (error) {
      console.error("Error fetching picks:", error);
      return res.status(500).json({ error: "Failed to fetch picks" });
    }
  });

  app.get("/api/golf/pools/:poolId/picks/:weekNumber", async (req, res) => {
    try {
      const weekNumber = parseInt(req.params.weekNumber);
      const picks = await storage.getGolfPicksForWeek(req.params.poolId, weekNumber);
      return res.json(picks);
    } catch (error) {
      console.error("Error fetching picks for week:", error);
      return res.status(500).json({ error: "Failed to fetch picks" });
    }
  });

  app.post("/api/golf/entries/:entryId/picks", async (req, res) => {
    try {
      const entry = await storage.getGolfPoolEntry(req.params.entryId);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      
      // Check if entry is still active
      if (entry.status === "eliminated") {
        return res.status(400).json({ error: "Entry has been eliminated" });
      }
      
      // Check if golfer was already used
      const usedGolfers = entry.usedGolfers || [];
      if (usedGolfers.includes(req.body.golferName)) {
        return res.status(400).json({ error: "This golfer has already been used" });
      }
      
      const pool = await storage.getGolfPool(entry.poolId);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }
      
      const validation = insertGolfPickSchema.safeParse({
        ...req.body,
        entryId: req.params.entryId,
        poolId: entry.poolId,
      });
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const pick = await storage.createGolfPick(validation.data);
      
      // Update used golfers list
      await storage.updateGolfPoolEntry(entry.id, {
        usedGolfers: [...usedGolfers, req.body.golferName],
      });
      
      return res.json(pick);
    } catch (error) {
      console.error("Error creating pick:", error);
      return res.status(500).json({ error: "Failed to create pick" });
    }
  });

  // Admin: Update pick result
  app.patch("/api/golf/picks/:id", isAdmin, async (req, res) => {
    try {
      const pick = await storage.updateGolfPick(req.params.id, req.body);
      if (!pick) {
        return res.status(404).json({ error: "Pick not found" });
      }
      
      // If pick result is eliminated, update the entry status
      if (req.body.result === "eliminated") {
        const entry = await storage.getGolfPoolEntry(pick.entryId);
        if (entry) {
          await storage.updateGolfPoolEntry(entry.id, {
            status: "eliminated",
            eliminatedWeek: pick.weekNumber,
          });
        }
      }
      
      return res.json(pick);
    } catch (error) {
      console.error("Error updating pick:", error);
      return res.status(500).json({ error: "Failed to update pick" });
    }
  });

  // ========== PUBLIC GOLF SURVIVOR ROUTES ==========

  // Get all public golf pools (open for signup)
  app.get("/api/public/golf/pools", async (req, res) => {
    try {
      // Get all pools that are open for signup
      const { operators } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      
      // For now, get pools from the primary operator (south-bay-pools)
      const primaryOperator = await storage.getOperatorBySlug("south-bay-pools");
      if (!primaryOperator) {
        return res.json([]);
      }
      
      const pools = await storage.getAllGolfPools(primaryOperator.id);
      
      // Filter to open pools and add entry counts
      const publicPools = await Promise.all(
        pools
          .filter(p => p.status === "active" || p.status === "upcoming")
          .map(async (pool) => {
            const entries = await storage.getGolfPoolEntries(pool.id);
            return {
              id: pool.id,
              name: pool.name,
              slug: pool.slug,
              season: pool.season,
              entryFee: pool.entryFee,
              entryCount: entries.length,
              currentWeek: pool.currentWeek,
            };
          })
      );
      
      res.json(publicPools);
    } catch (error) {
      console.error("Error fetching public golf pools:", error);
      res.status(500).json({ error: "Failed to fetch pools" });
    }
  });

  // Get public golf pool details by slug or id
  app.get("/api/public/golf/pools/:identifier", async (req, res) => {
    try {
      const { identifier } = req.params;
      
      // Try by ID first (UUID format)
      let pool = await storage.getGolfPool(identifier);
      
      // If not found, try by slug
      if (!pool) {
        pool = await storage.getGolfPoolBySlug(identifier);
      }
      
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }
      
      const entries = await storage.getGolfPoolEntries(pool.id);
      
      res.json({
        id: pool.id,
        name: pool.name,
        slug: pool.slug,
        season: pool.season,
        entryFee: pool.entryFee,
        currentWeek: pool.currentWeek,
        entryCount: entries.length,
        status: pool.status,
      });
    } catch (error) {
      console.error("Error fetching public golf pool:", error);
      res.status(500).json({ error: "Failed to fetch pool" });
    }
  });

  // Participant self-registration for golf pool (requires auth)
  app.post("/api/participant/golf/pools/:poolId/signup", isAuthenticated, async (req: any, res) => {
    try {
      const { poolId } = req.params;
      const { entryName } = req.body;
      
      // Validate entry name
      if (!entryName || typeof entryName !== "string" || entryName.trim().length === 0) {
        return res.status(400).json({ error: "Entry name is required" });
      }
      
      if (entryName.trim().length > 100) {
        return res.status(400).json({ error: "Entry name is too long (max 100 characters)" });
      }
      
      // Get the pool
      let pool;
      try {
        pool = await storage.getGolfPool(poolId);
      } catch (err) {
        console.error("Error fetching pool:", err);
        return res.status(500).json({ error: "Unable to process request" });
      }
      
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }
      
      // Only allow signup for active or upcoming pools
      if (pool.status !== "active" && pool.status !== "upcoming") {
        return res.status(400).json({ error: "This pool is no longer accepting registrations" });
      }
      
      // Get participant info
      const authId = req.user.claims.sub;
      const email = req.user.claims.email;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Check if this email already has an entry in this pool
      let existingEntries;
      try {
        existingEntries = await storage.getGolfPoolEntries(poolId);
      } catch (err) {
        console.error("Error checking existing entries:", err);
        return res.status(500).json({ error: "Unable to process request" });
      }
      
      const hasExisting = existingEntries.some(e => e.email.toLowerCase() === email.toLowerCase());
      if (hasExisting) {
        return res.status(400).json({ error: "You already have an entry in this pool" });
      }
      
      // Get or create participant
      let participant;
      try {
        participant = await storage.getParticipantByAuthId(authId);
        if (!participant) {
          participant = await storage.upsertParticipant({
            authId,
            email,
            firstName: req.user.claims.first_name,
            lastName: req.user.claims.last_name,
            profileImageUrl: req.user.claims.profile_image_url,
          });
        }
      } catch (err) {
        console.error("Error managing participant:", err);
        return res.status(500).json({ error: "Unable to process request" });
      }
      
      // Create the entry
      let entry;
      try {
        entry = await storage.createGolfPoolEntry({
          poolId,
          entryName: entryName.trim(),
          email,
          participantId: participant.id,
          status: "active",
        });
      } catch (err) {
        console.error("Error creating entry:", err);
        return res.status(500).json({ error: "Unable to create entry" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Error in golf pool signup:", error);
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  });

  // Get participant's golf entries
  app.get("/api/participant/golf/entries", isAuthenticated, async (req: any, res) => {
    try {
      const email = req.user.claims.email;
      
      if (!email) {
        return res.status(400).json({ error: "Email not found" });
      }
      
      const entries = await storage.getGolfPoolEntriesByEmail(email);
      
      // Add pool info to each entry
      const entriesWithPool = await Promise.all(
        entries.map(async (entry) => {
          const pool = await storage.getGolfPool(entry.poolId);
          return {
            ...entry,
            poolName: pool?.name,
            poolSlug: pool?.slug,
            poolSeason: pool?.season,
            poolCurrentWeek: pool?.currentWeek,
          };
        })
      );
      
      res.json(entriesWithPool);
    } catch (error) {
      console.error("Error fetching participant golf entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
