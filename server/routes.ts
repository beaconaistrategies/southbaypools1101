import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContestSchema, updateContestSchema, updateSquareSchema } from "@shared/schema";
import { z } from "zod";

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
        return res.status(400).json({ error: "Invalid contest data", details: error.errors });
      }
      console.error("Error creating contest:", error);
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
        topLayerLabels: originalContest.topLayerLabels,
        leftLayerLabels: originalContest.leftLayerLabels,
        redHeadersCount: originalContest.redHeadersCount,
        showRedHeaders: false,
        prizes: originalContest.prizes,
        winners: [],
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
      res.json(square);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating square:", error);
      res.status(500).json({ error: "Failed to update square" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
