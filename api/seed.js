// server/vercel/seed.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "DATABASE_URL not configured" });
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        DO $$ BEGIN CREATE TYPE contest_status AS ENUM ('open', 'locked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN CREATE TYPE square_status AS ENUM ('available', 'taken', 'disabled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN CREATE TYPE operator_plan AS ENUM ('free', 'basic', 'pro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN CREATE TYPE operator_status AS ENUM ('active', 'suspended', 'trial'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'member', 'trial'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN CREATE TYPE golf_pool_status AS ENUM ('upcoming', 'active', 'completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN CREATE TYPE golf_entry_status AS ENUM ('active', 'eliminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN CREATE TYPE golf_pick_result AS ENUM ('pending', 'survived', 'eliminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN CREATE TYPE earnings_pool_status AS ENUM ('setup', 'open', 'locked', 'live', 'completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        CREATE TABLE IF NOT EXISTS operators (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          slug varchar(100) UNIQUE NOT NULL,
          plan operator_plan NOT NULL DEFAULT 'free',
          status operator_status NOT NULL DEFAULT 'trial',
          billing_customer_id varchar,
          max_contests integer NOT NULL DEFAULT 3,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS sessions (
          sid varchar PRIMARY KEY,
          sess jsonb NOT NULL,
          expire timestamp NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

        CREATE TABLE IF NOT EXISTS users (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          operator_id varchar REFERENCES operators(id) ON DELETE CASCADE,
          email varchar UNIQUE,
          password_hash varchar,
          first_name varchar,
          last_name varchar,
          profile_image_url varchar,
          role user_role NOT NULL DEFAULT 'member',
          is_admin boolean NOT NULL DEFAULT false,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS participants (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          auth_id varchar UNIQUE,
          email varchar UNIQUE NOT NULL,
          first_name varchar,
          last_name varchar,
          profile_image_url varchar,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS folders (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          operator_id varchar REFERENCES operators(id) ON DELETE CASCADE,
          name text NOT NULL,
          created_at timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS contests (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          operator_id varchar REFERENCES operators(id) ON DELETE CASCADE,
          name text NOT NULL,
          slug varchar(100),
          event_date timestamp NOT NULL,
          top_team text NOT NULL,
          left_team text NOT NULL,
          notes text,
          folder_id varchar REFERENCES folders(id) ON DELETE SET NULL,
          top_axis_numbers jsonb NOT NULL,
          left_axis_numbers jsonb NOT NULL,
          layer_labels jsonb,
          red_rows_count integer NOT NULL DEFAULT 2,
          show_red_headers boolean NOT NULL DEFAULT false,
          header_colors_enabled boolean NOT NULL DEFAULT true,
          layer_colors jsonb,
          layer_color_groups jsonb,
          status contest_status NOT NULL DEFAULT 'open',
          prizes jsonb DEFAULT '[]'::jsonb,
          winners jsonb DEFAULT '[]'::jsonb,
          q1_winner text, q2_winner text, q3_winner text, q4_winner text,
          webhook_url text,
          created_at timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS squares (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          contest_id varchar NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
          index integer NOT NULL,
          row integer NOT NULL,
          col integer NOT NULL,
          status square_status NOT NULL DEFAULT 'available',
          entry_name text,
          holder_name text,
          holder_email text,
          participant_id varchar REFERENCES participants(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS contest_managers (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          contest_id varchar NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
          operator_id varchar NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
          created_at timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS square_templates (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          operator_id varchar REFERENCES operators(id) ON DELETE CASCADE,
          name text NOT NULL,
          squares jsonb NOT NULL DEFAULT '[]'::jsonb,
          created_at timestamp NOT NULL DEFAULT now()
        );

        -- Golf Survivor tables
        CREATE TABLE IF NOT EXISTS golf_tournaments (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          start_date timestamp NOT NULL,
          end_date timestamp NOT NULL,
          season integer NOT NULL,
          week_number integer,
          created_at timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS golf_pools (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          operator_id varchar REFERENCES operators(id) ON DELETE CASCADE,
          name text NOT NULL,
          slug varchar(100),
          season integer NOT NULL,
          entry_fee text,
          prize_pool text,
          status golf_pool_status NOT NULL DEFAULT 'upcoming',
          current_week integer DEFAULT 1,
          pick_deadline_hours integer DEFAULT 0,
          show_picks_override boolean DEFAULT false,
          notes text,
          webhook_url text,
          created_at timestamp NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "golf_pools_operator_slug_unique" ON golf_pools (operator_id, slug);

        CREATE TABLE IF NOT EXISTS golf_pool_entries (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          pool_id varchar NOT NULL REFERENCES golf_pools(id) ON DELETE CASCADE,
          participant_id varchar REFERENCES participants(id) ON DELETE SET NULL,
          entry_name text NOT NULL,
          email text NOT NULL,
          manage_token varchar DEFAULT gen_random_uuid(),
          status golf_entry_status NOT NULL DEFAULT 'active',
          eliminated_week integer,
          used_golfers jsonb DEFAULT '[]'::jsonb,
          created_at timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "golf_pool_entries_pool_idx" ON golf_pool_entries (pool_id);
        CREATE INDEX IF NOT EXISTS "golf_pool_entries_email_idx" ON golf_pool_entries (email);
        CREATE INDEX IF NOT EXISTS "golf_pool_entries_token_idx" ON golf_pool_entries (manage_token);

        CREATE TABLE IF NOT EXISTS golf_picks (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          entry_id varchar NOT NULL REFERENCES golf_pool_entries(id) ON DELETE CASCADE,
          pool_id varchar NOT NULL REFERENCES golf_pools(id) ON DELETE CASCADE,
          tournament_id varchar REFERENCES golf_tournaments(id) ON DELETE SET NULL,
          tournament_name text,
          week_number integer NOT NULL,
          golfer_name text NOT NULL,
          is_auto_pick boolean NOT NULL DEFAULT false,
          result golf_pick_result NOT NULL DEFAULT 'pending',
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "golf_picks_entry_idx" ON golf_picks (entry_id);
        CREATE INDEX IF NOT EXISTS "golf_picks_pool_week_idx" ON golf_picks (pool_id, week_number);
        CREATE UNIQUE INDEX IF NOT EXISTS "golf_picks_entry_week_unique" ON golf_picks (entry_id, week_number);

        CREATE TABLE IF NOT EXISTS golf_pick_history (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          pick_id varchar NOT NULL REFERENCES golf_picks(id) ON DELETE CASCADE,
          entry_id varchar NOT NULL REFERENCES golf_pool_entries(id) ON DELETE CASCADE,
          pool_id varchar NOT NULL REFERENCES golf_pools(id) ON DELETE CASCADE,
          week_number integer NOT NULL,
          golfer_name text NOT NULL,
          tournament_name text,
          changed_at timestamp NOT NULL DEFAULT now(),
          changed_by text,
          reason text
        );
        CREATE INDEX IF NOT EXISTS "golf_pick_history_pick_idx" ON golf_pick_history (pick_id);
        CREATE INDEX IF NOT EXISTS "golf_pick_history_entry_idx" ON golf_pick_history (entry_id);
        CREATE INDEX IF NOT EXISTS "golf_pick_history_pool_week_idx" ON golf_pick_history (pool_id, week_number);

        -- Earnings Pool tables
        CREATE TABLE IF NOT EXISTS earnings_pools (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          operator_id varchar REFERENCES operators(id) ON DELETE CASCADE,
          name text NOT NULL,
          slug varchar(100),
          tournament_name text NOT NULL,
          tournament_dg_id varchar,
          season integer NOT NULL,
          entry_fee text,
          max_entries_per_email integer NOT NULL DEFAULT 1,
          status earnings_pool_status NOT NULL DEFAULT 'setup',
          notes text,
          purse_total_cents integer,
          payout_structure jsonb,
          rankings_cache jsonb,
          rankings_cache_updated_at timestamp,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "earnings_pools_operator_slug_unique" ON earnings_pools (operator_id, slug);

        CREATE TABLE IF NOT EXISTS earnings_pool_golfers (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          pool_id varchar NOT NULL REFERENCES earnings_pools(id) ON DELETE CASCADE,
          dg_id integer NOT NULL,
          name text NOT NULL,
          country text,
          tier integer NOT NULL,
          dg_rank integer,
          owgr_rank integer,
          current_position text,
          current_earnings_cents integer NOT NULL DEFAULT 0,
          status text NOT NULL DEFAULT 'active',
          created_at timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "earnings_pool_golfers_pool_idx" ON earnings_pool_golfers (pool_id);
        CREATE UNIQUE INDEX IF NOT EXISTS "earnings_pool_golfers_pool_dg_unique" ON earnings_pool_golfers (pool_id, dg_id);
        CREATE INDEX IF NOT EXISTS "earnings_pool_golfers_tier_idx" ON earnings_pool_golfers (pool_id, tier);

        CREATE TABLE IF NOT EXISTS earnings_pool_entries (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          pool_id varchar NOT NULL REFERENCES earnings_pools(id) ON DELETE CASCADE,
          entry_name text NOT NULL,
          email text NOT NULL,
          tier1_golfer_id varchar NOT NULL REFERENCES earnings_pool_golfers(id),
          tier2_golfer_id varchar NOT NULL REFERENCES earnings_pool_golfers(id),
          tier3_golfer_id varchar NOT NULL REFERENCES earnings_pool_golfers(id),
          tier4_golfer_id varchar NOT NULL REFERENCES earnings_pool_golfers(id),
          total_earnings_cents integer NOT NULL DEFAULT 0,
          current_rank integer,
          created_at timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "earnings_pool_entries_pool_idx" ON earnings_pool_entries (pool_id);
        CREATE INDEX IF NOT EXISTS "earnings_pool_entries_email_idx" ON earnings_pool_entries (email);
        CREATE INDEX IF NOT EXISTS "earnings_pool_entries_rank_idx" ON earnings_pool_entries (pool_id, current_rank);
      `);
      let result = await client.query(
        `SELECT id FROM operators WHERE slug = 'south-bay-pools' LIMIT 1`
      );
      let operatorId;
      if (result.rows.length === 0) {
        const created = await client.query(
          `INSERT INTO operators (id, name, slug, plan, status, max_contests)
           VALUES (gen_random_uuid(), 'South Bay Pools', 'south-bay-pools', 'free', 'active', 10)
           RETURNING id`
        );
        operatorId = created.rows[0].id;
      } else {
        operatorId = result.rows[0].id;
      }
      const existing = await client.query(
        `SELECT id FROM earnings_pools WHERE slug = 'masters-2026' AND operator_id = $1 LIMIT 1`,
        [operatorId]
      );
      if (existing.rows.length > 0) {
        client.release();
        await pool.end();
        return res.json({ message: "Golf pool already exists", poolId: existing.rows[0].id, slug: "masters-2026" });
      }
      const poolResult = await client.query(
        `INSERT INTO earnings_pools (
          id, operator_id, name, slug, tournament_name, season,
          entry_fee, max_entries_per_email, status, notes, purse_total_cents
        ) VALUES (
          gen_random_uuid(), $1, '2026 Masters Pool', 'masters-2026',
          'The Masters', 2026, '$50', 3, 'open',
          'Pick one golfer from each tier. Your team''s total earnings determines your rank. Entry fee: $50.',
          2000000000
        ) RETURNING id`,
        [operatorId]
      );
      const poolId = poolResult.rows[0].id;
      const golfers = [
        // Tier 1 - Elite (Top 10 ranked)
        { name: "Scottie Scheffler", dgId: 18846, country: "USA", tier: 1, dgRank: 1 },
        { name: "Xander Schauffele", dgId: 17094, country: "USA", tier: 1, dgRank: 2 },
        { name: "Rory McIlroy", dgId: 12671, country: "NIR", tier: 1, dgRank: 3 },
        { name: "Collin Morikawa", dgId: 20098, country: "USA", tier: 1, dgRank: 4 },
        { name: "Ludvig \xC5berg", dgId: 25764, country: "SWE", tier: 1, dgRank: 5 },
        { name: "Jon Rahm", dgId: 17292, country: "ESP", tier: 1, dgRank: 6 },
        { name: "Viktor Hovland", dgId: 20766, country: "NOR", tier: 1, dgRank: 7 },
        { name: "Patrick Cantlay", dgId: 14350, country: "USA", tier: 1, dgRank: 8 },
        { name: "Bryson DeChambeau", dgId: 16081, country: "USA", tier: 1, dgRank: 9 },
        { name: "Wyndham Clark", dgId: 20373, country: "USA", tier: 1, dgRank: 10 },
        // Tier 2 - Contenders (11-25)
        { name: "Tommy Fleetwood", dgId: 13882, country: "ENG", tier: 2, dgRank: 11 },
        { name: "Shane Lowry", dgId: 10689, country: "IRL", tier: 2, dgRank: 12 },
        { name: "Sahith Theegala", dgId: 21528, country: "USA", tier: 2, dgRank: 13 },
        { name: "Hideki Matsuyama", dgId: 12161, country: "JPN", tier: 2, dgRank: 14 },
        { name: "Sam Burns", dgId: 19203, country: "USA", tier: 2, dgRank: 15 },
        { name: "Sungjae Im", dgId: 20230, country: "KOR", tier: 2, dgRank: 16 },
        { name: "Russell Henley", dgId: 11725, country: "USA", tier: 2, dgRank: 17 },
        { name: "Tony Finau", dgId: 15349, country: "USA", tier: 2, dgRank: 18 },
        { name: "Justin Thomas", dgId: 16543, country: "USA", tier: 2, dgRank: 19 },
        { name: "Matt Fitzpatrick", dgId: 15212, country: "ENG", tier: 2, dgRank: 20 },
        // Tier 3 - Dark Horses (26-45)
        { name: "Keegan Bradley", dgId: 10690, country: "USA", tier: 3, dgRank: 26 },
        { name: "Cameron Young", dgId: 22571, country: "USA", tier: 3, dgRank: 27 },
        { name: "Aaron Rai", dgId: 17957, country: "ENG", tier: 3, dgRank: 28 },
        { name: "Akshay Bhatia", dgId: 22938, country: "USA", tier: 3, dgRank: 29 },
        { name: "Chris Kirk", dgId: 11612, country: "USA", tier: 3, dgRank: 30 },
        { name: "Robert MacIntyre", dgId: 20927, country: "SCO", tier: 3, dgRank: 31 },
        { name: "Min Woo Lee", dgId: 21363, country: "AUS", tier: 3, dgRank: 32 },
        { name: "Corey Conners", dgId: 17893, country: "CAN", tier: 3, dgRank: 33 },
        { name: "Jason Day", dgId: 10289, country: "AUS", tier: 3, dgRank: 34 },
        { name: "Si Woo Kim", dgId: 16486, country: "KOR", tier: 3, dgRank: 35 },
        // Tier 4 - Longshots (46+)
        { name: "Sepp Straka", dgId: 18449, country: "AUT", tier: 4, dgRank: 46 },
        { name: "Adam Scott", dgId: 646, country: "AUS", tier: 4, dgRank: 47 },
        { name: "Tiger Woods", dgId: 584, country: "USA", tier: 4, dgRank: 48 },
        { name: "Jordan Spieth", dgId: 14636, country: "USA", tier: 4, dgRank: 49 },
        { name: "Dustin Johnson", dgId: 10404, country: "USA", tier: 4, dgRank: 50 },
        { name: "Phil Mickelson", dgId: 476, country: "USA", tier: 4, dgRank: 55 },
        { name: "Rickie Fowler", dgId: 10397, country: "USA", tier: 4, dgRank: 60 },
        { name: "Brooks Koepka", dgId: 13948, country: "USA", tier: 4, dgRank: 62 },
        { name: "Cameron Smith", dgId: 15798, country: "AUS", tier: 4, dgRank: 65 },
        { name: "Joaqu\xEDn Niemann", dgId: 20505, country: "CHI", tier: 4, dgRank: 68 }
      ];
      const golferIds = { 1: [], 2: [], 3: [], 4: [] };
      for (const g of golfers) {
        const r = await client.query(
          `INSERT INTO earnings_pool_golfers (id, pool_id, dg_id, name, country, tier, dg_rank)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [poolId, g.dgId, g.name, g.country, g.tier, g.dgRank]
        );
        golferIds[g.tier].push(r.rows[0].id);
      }
      const entries = [
        { name: "Mike T.", email: "miket@example.com", t1: 0, t2: 3, t3: 1, t4: 2 },
        { name: "Sarah J.", email: "sarahj@example.com", t1: 1, t2: 0, t3: 4, t4: 0 },
        { name: "Dave R.", email: "daver@example.com", t1: 2, t2: 5, t3: 7, t4: 3 },
        { name: "Lisa M.", email: "lisam@example.com", t1: 0, t2: 2, t3: 0, t4: 5 },
        { name: "Chris P.", email: "chrisp@example.com", t1: 4, t2: 7, t3: 8, t4: 2 },
        { name: "Anna K.", email: "annak@example.com", t1: 5, t2: 1, t3: 3, t4: 9 },
        { name: "Tom B.", email: "tomb@example.com", t1: 3, t2: 9, t3: 5, t4: 7 },
        { name: "Jenny W.", email: "jennyw@example.com", t1: 6, t2: 4, t3: 2, t4: 1 },
        { name: "Rick S.", email: "ricks@example.com", t1: 7, t2: 6, t3: 9, t4: 4 },
        { name: "Nicole H.", email: "nicoleh@example.com", t1: 9, t2: 8, t3: 6, t4: 8 }
      ];
      let entryCount = 0;
      for (const e of entries) {
        await client.query(
          `INSERT INTO earnings_pool_entries (
            id, pool_id, entry_name, email,
            tier1_golfer_id, tier2_golfer_id, tier3_golfer_id, tier4_golfer_id
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
          [
            poolId,
            e.name,
            e.email,
            golferIds[1][e.t1],
            golferIds[2][e.t2],
            golferIds[3][e.t3],
            golferIds[4][e.t4]
          ]
        );
        entryCount++;
      }
      const majors = [
        { name: "The Masters", start: "2026-04-09", end: "2026-04-12", week: 1 },
        { name: "PGA Championship", start: "2026-05-14", end: "2026-05-17", week: 2 },
        { name: "U.S. Open", start: "2026-06-18", end: "2026-06-21", week: 3 },
        { name: "The Open Championship", start: "2026-07-16", end: "2026-07-19", week: 4 }
      ];
      for (const m of majors) {
        await client.query(
          `INSERT INTO golf_tournaments (id, name, start_date, end_date, season, week_number)
           VALUES (gen_random_uuid(), $1, $2, $3, 2026, $4)
           ON CONFLICT DO NOTHING`,
          [m.name, m.start, m.end, m.week]
        );
      }
      client.release();
      await pool.end();
      return res.status(201).json({
        message: "2026 Masters Earnings Pool created",
        poolId,
        slug: "masters-2026",
        golfers: golfers.length,
        entries: entryCount,
        tiers: {
          tier1: golferIds[1].length,
          tier2: golferIds[2].length,
          tier3: golferIds[3].length,
          tier4: golferIds[4].length
        }
      });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    try {
      await pool.end();
    } catch (_) {
    }
    console.error("Seed error:", error);
    return res.status(500).json({ error: "Failed to seed golf pool", details: error.message });
  }
}
export {
  handler as default
};
