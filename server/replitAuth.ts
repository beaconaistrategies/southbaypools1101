// Replit Auth integration for admin authentication
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Session durations
const SESSION_TTL_DEFAULT = 7 * 24 * 60 * 60 * 1000; // 1 week
const SESSION_TTL_REMEMBER = 30 * 24 * 60 * 60 * 1000; // 30 days

export function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: SESSION_TTL_REMEMBER, // Use max TTL for store, cookie controls actual expiry
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: SESSION_TTL_DEFAULT,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

async function upsertUser(
  claims: any,
) {
  const existingUser = await storage.getUser(claims["sub"]);
  
  if (existingUser) {
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
  } else {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { sql } = await import("drizzle-orm");
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const isFirstUser = count === 0;
    
    // Create an operator for the new user
    const firstName = claims["first_name"] || "";
    const lastName = claims["last_name"] || "";
    const operatorName = `${firstName} ${lastName}`.trim() || claims["email"]?.split("@")[0] || "My Pools";
    
    // Generate unique slug
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
    
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      operatorId: operator.id,
      isAdmin: true, // All new users are admins of their own operator
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Get the primary domain from REPLIT_DOMAINS
  const getPrimaryDomain = () => {
    const domains = process.env.REPLIT_DOMAINS;
    if (domains) {
      const domainList = domains.split(',');
      return domainList[0];
    }
    return 'localhost:5000';
  };

  const primaryDomain = getPrimaryDomain();
  
  const strategy = new Strategy(
    {
      name: "replitauth",
      config,
      scope: "openid email profile offline_access",
      callbackURL: `https://${primaryDomain}/api/callback`,
    },
    verify,
  );
  passport.use(strategy);

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Store remember preference in session before redirecting
    const remember = req.query.remember === "true";
    (req.session as any).rememberMe = remember;
    
    passport.authenticate("replitauth", {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Force account selection - allows signing in with a different account
  app.get("/api/login/select-account", (req, res, next) => {
    // Store remember preference in session before redirecting
    const remember = req.query.remember === "true";
    (req.session as any).rememberMe = remember;
    
    passport.authenticate("replitauth", {
      prompt: "select_account consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate("replitauth", (err: any, user: any, info: any) => {
      if (err || !user) {
        // Clear rememberMe on error
        delete (req.session as any).rememberMe;
        return res.redirect("/api/login");
      }
      
      req.logIn(user, (loginErr: any) => {
        if (loginErr) {
          // Clear rememberMe on error
          delete (req.session as any).rememberMe;
          return res.redirect("/api/login");
        }
        
        // Check if user opted for "Stay Signed In"
        const rememberMe = (req.session as any).rememberMe;
        if (rememberMe && req.session.cookie) {
          req.session.cookie.maxAge = SESSION_TTL_REMEMBER;
        }
        
        // Clear session flag
        delete (req.session as any).rememberMe;
        
        // Always redirect to home - safe and consistent
        res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const primaryDomain = getPrimaryDomain();
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `https://${primaryDomain}`,
        }).href
      );
    });
  });
}

// Basic authentication check
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Admin-only authentication check
export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser || !dbUser.isAdmin) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
