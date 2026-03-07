// Simple email/password authentication for Vercel deployment
// Drop-in replacement for replitAuth.ts - no Replit, no Passport, no OIDC
import crypto from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { hasRolePermission, type UserRole } from "@shared/schema";

// Session durations
const SESSION_TTL_DEFAULT = 7 * 24 * 60 * 60 * 1000; // 1 week
const SESSION_TTL_REMEMBER = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------- Password hashing with Node.js crypto.scrypt ----------

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    if (!salt || !key) return resolve(false);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey));
    });
  });
}

// ---------- Slug helper (same as replitAuth) ----------

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

// ---------- Session setup ----------

export function getSession() {
  const MemoryStore = createMemoryStore(session);
  return session({
    secret: process.env.SESSION_SECRET || "southbaypools-dev-secret-change-me",
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_DEFAULT,
    },
  });
}

// ---------- setupAuth ----------

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Attach req.user from session on every request so middleware can use it
  app.use((req, _res, next) => {
    if ((req.session as any).userId) {
      (req as any).user = {
        claims: { sub: (req.session as any).userId },
      };
    }
    next();
  });

  // ---- POST /api/auth/register ----
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Check if email already in use
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Determine if this is the first user (becomes admin / super_admin)
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);
      const isFirstUser = count === 0;

      const passwordHash = await hashPassword(password);

      // Create operator for the new user
      const operatorName =
        `${firstName || ""} ${lastName || ""}`.trim() ||
        email.split("@")[0] ||
        "My Pools";

      let baseSlug = generateSlug(operatorName);
      let slug = baseSlug;
      let suffix = 1;
      while (await storage.getOperatorBySlug(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      }

      const operator = await storage.createOperator({
        name: operatorName,
        slug,
        plan: "free",
        status: "trial",
        maxContests: 3,
      });

      const user = await storage.upsertUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        passwordHash,
        operatorId: operator.id,
        role: isFirstUser ? "super_admin" : "admin",
        isAdmin: true,
      });

      // Set session
      (req.session as any).userId = user.id;
      (req as any).user = { claims: { sub: user.id } };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        return res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          operatorId: user.operatorId,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---- POST /api/auth/login ----
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, remember } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !(user as any).passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await verifyPassword(password, (user as any).passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;
      (req as any).user = { claims: { sub: user.id } };

      if (remember) {
        req.session.cookie.maxAge = SESSION_TTL_REMEMBER;
      }

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        return res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          operatorId: user.operatorId,
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---- POST /api/auth/logout ----
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  // ---- GET /api/auth/me - convenience endpoint ----
  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        operatorId: user.operatorId,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.error("Auth me error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}

// ---------- Middleware ----------

// Basic authentication check
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Ensure req.user is populated for downstream code
  (req as any).user = { claims: { sub: userId } };
  return next();
};

// Admin-only authentication check (uses role field)
export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await storage.getUser(userId);
    if (!dbUser) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }
    if (!hasRolePermission(dbUser.role as UserRole, "admin")) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }
    (req as any).user = { claims: { sub: userId } };
    (req as any).dbUser = dbUser;
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Super Admin check - platform-level access
export const isSuperAdmin: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await storage.getUser(userId);
    if (!dbUser || dbUser.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden - Super Admin access required" });
    }
    (req as any).user = { claims: { sub: userId } };
    (req as any).dbUser = dbUser;
    next();
  } catch (error) {
    console.error("Error checking super admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Role-based middleware factory
export const requireRole = (...allowedRoles: UserRole[]): RequestHandler => {
  return async (req, res, next) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userRole = dbUser.role as UserRole;
      const hasAccess = allowedRoles.some((role) => hasRolePermission(userRole, role));

      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: `Forbidden - Requires ${allowedRoles.join(" or ")} role` });
      }

      (req as any).user = { claims: { sub: userId } };
      (req as any).dbUser = dbUser;
      next();
    } catch (error) {
      console.error("Error checking role:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Manager check - must be assigned to the specific contest
export const isContestManagerOrAdmin = (
  getContestId: (req: any) => string
): RequestHandler => {
  return async (req, res, next) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userRole = dbUser.role as UserRole;

      // Admins and super admins can access all contests
      if (hasRolePermission(userRole, "admin")) {
        (req as any).user = { claims: { sub: userId } };
        (req as any).dbUser = dbUser;
        return next();
      }

      // Managers can only access assigned contests
      if (userRole === "manager") {
        const contestId = getContestId(req);
        const isManager = await storage.isContestManager(dbUser.id, contestId);
        if (isManager) {
          (req as any).user = { claims: { sub: userId } };
          (req as any).dbUser = dbUser;
          return next();
        }
      }

      return res
        .status(403)
        .json({ message: "Forbidden - Not authorized for this contest" });
    } catch (error) {
      console.error("Error checking contest access:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};
