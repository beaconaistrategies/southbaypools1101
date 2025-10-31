import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContestSchema, updateContestSchema, updateSquareSchema, insertFolderSchema } from "@shared/schema";
import { z } from "zod";
import { sendWebhookNotification } from "./webhook";

export async function registerRoutes(app: Express): Promise<Server> {
  // Contest routes
  
  // Get all contests with square counts
  app.get("/api/contests", async (req, res) => {
    try {
      const contests = await storage.getAllContests();
      
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

  // Get a single contest
  app.get("/api/contests/:id", async (req, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      res.json(contest);
    } catch (error) {
      console.error("Error fetching contest:", error);
      res.status(500).json({ error: "Failed to fetch contest" });
    }
  });

  // Create a contest with initial squares
  app.post("/api/contests", async (req, res) => {
    try {
      // Validate contest data
      const contestData = insertContestSchema.parse({
        ...req.body,
        eventDate: new Date(req.body.eventDate),
      });
      
      // Create the contest
      const contest = await storage.createContest(contestData);
      
      // Get available squares from request body (default to all 100)
      const availableSquares = req.body.availableSquares || Array.from({ length: 100 }, (_, i) => i + 1);
      
      // Create initial squares for the contest
      const squaresToCreate = Array.from({ length: 100 }, (_, i) => {
        const index = i + 1;
        return {
          contestId: contest.id,
          index,
          row: Math.floor(i / 10),
          col: i % 10,
          status: availableSquares.includes(index) ? ("available" as const) : ("disabled" as const),
        };
      });
      
      await storage.createSquares(squaresToCreate);
      
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

  // Update a contest
  app.patch("/api/contests/:id", async (req, res) => {
    try {
      // Convert eventDate if present
      const bodyWithDate = req.body.eventDate 
        ? { ...req.body, eventDate: new Date(req.body.eventDate) }
        : req.body;
      
      // Validate update data
      const updateData = updateContestSchema.parse(bodyWithDate);
      
      const contest = await storage.updateContest(req.params.id, updateData);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
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

  // Delete a contest
  app.delete("/api/contests/:id", async (req, res) => {
    try {
      await storage.deleteContest(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contest:", error);
      res.status(500).json({ error: "Failed to delete contest" });
    }
  });

  // Clone a contest
  app.post("/api/contests/:id/clone", async (req, res) => {
    try {
      const originalContest = await storage.getContest(req.params.id);
      if (!originalContest) {
        return res.status(404).json({ error: "Contest not found" });
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

      const clonedContest = await storage.createContest(clonedContestData);

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

  // Get contests by participant email
  app.get("/api/my-contests/:email", async (req, res) => {
    try {
      const email = req.params.email.toLowerCase().trim();
      const contests = await storage.getAllContests();
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
  app.patch("/api/contests/:contestId/squares/:index", async (req, res) => {
    try {
      const index = parseInt(req.params.index);
      
      // Validate update data
      const updateData = updateSquareSchema.parse(req.body);
      
      const square = await storage.updateSquareByContestAndIndex(
        req.params.contestId,
        index,
        updateData
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

  // Folder routes
  
  // Get all folders
  app.get("/api/folders", async (req, res) => {
    try {
      const folders = await storage.getAllFolders();
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  // Create a folder
  app.post("/api/folders", async (req, res) => {
    try {
      const folderData = insertFolderSchema.parse(req.body);
      const folder = await storage.createFolder(folderData);
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid folder data", details: error.errors });
      }
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  // Delete a folder
  app.delete("/api/folders/:id", async (req, res) => {
    try {
      await storage.deleteFolder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ error: "Failed to delete folder" });
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

  const httpServer = createServer(app);

  return httpServer;
}
