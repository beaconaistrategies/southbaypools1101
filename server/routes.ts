import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContestSchema, insertSquareSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Contest routes
  
  // Get all contests
  app.get("/api/contests", async (req, res) => {
    try {
      const contests = await storage.getAllContests();
      res.json(contests);
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
          status: availableSquares.includes(index) ? "available" : "disabled",
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
      const updateData: any = {};
      
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.eventDate !== undefined) updateData.eventDate = new Date(req.body.eventDate);
      if (req.body.topTeam !== undefined) updateData.topTeam = req.body.topTeam;
      if (req.body.leftTeam !== undefined) updateData.leftTeam = req.body.leftTeam;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.topAxisNumbers !== undefined) updateData.topAxisNumbers = req.body.topAxisNumbers;
      if (req.body.leftAxisNumbers !== undefined) updateData.leftAxisNumbers = req.body.leftAxisNumbers;
      if (req.body.redRowsCount !== undefined) updateData.redRowsCount = req.body.redRowsCount;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.q1Winner !== undefined) updateData.q1Winner = req.body.q1Winner;
      if (req.body.q2Winner !== undefined) updateData.q2Winner = req.body.q2Winner;
      if (req.body.q3Winner !== undefined) updateData.q3Winner = req.body.q3Winner;
      if (req.body.q4Winner !== undefined) updateData.q4Winner = req.body.q4Winner;
      
      const contest = await storage.updateContest(req.params.id, updateData);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      res.json(contest);
    } catch (error) {
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
      const updateData: any = {};
      
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.entryName !== undefined) updateData.entryName = req.body.entryName;
      if (req.body.holderName !== undefined) updateData.holderName = req.body.holderName;
      if (req.body.holderEmail !== undefined) updateData.holderEmail = req.body.holderEmail;
      
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
      console.error("Error updating square:", error);
      res.status(500).json({ error: "Failed to update square" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
