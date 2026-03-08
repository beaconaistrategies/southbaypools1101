// Vercel serverless function entry point
// All imports are dynamic to catch module-level errors

let app: any = null;
let initialized = false;

async function getApp() {
  if (app) return app;

  const express = (await import("express")).default;
  app = express();

  app.use(express.json({
    verify: (req: any, _res: any, buf: any) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: false }));

  // Request logging for API routes
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson: any, ...args: any[]) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }
        console.log(logLine);
      }
    });

    next();
  });

  // Cron endpoint for refreshing earnings pool scores
  app.get("/api/cron/refresh-scores", async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { db } = await import("../server/db");
      const { earningsPools } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const { refreshEarningsPool } = await import("../server/earningsEngine");

      const livePools = await db.select().from(earningsPools)
        .where(eq(earningsPools.status, "live"));

      const results = [];
      for (const pool of livePools) {
        try {
          await refreshEarningsPool(pool.id);
          results.push({ poolId: pool.id, status: "refreshed" });
        } catch (error: any) {
          results.push({ poolId: pool.id, status: "error", message: error.message });
        }
      }

      return res.json({ refreshed: results.length, results });
    } catch (error: any) {
      console.error("Cron refresh error:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  return app;
}

async function ensureInitialized() {
  if (!initialized) {
    const currentApp = await getApp();
    const { registerRoutes } = await import("../server/routes");
    await registerRoutes(currentApp);

    currentApp.use((err: any, _req: any, res: any, _next: any) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    initialized = true;
  }
}

// Export for Vercel
export default async function handler(req: any, res: any) {
  try {
    await ensureInitialized();
    const currentApp = await getApp();
    return currentApp(req, res);
  } catch (error: any) {
    console.error("Handler initialization error:", error);
    res.status(500).json({
      error: error.message,
      code: error.code,
      stack: error.stack?.split("\n").slice(0, 10),
    });
  }
}
