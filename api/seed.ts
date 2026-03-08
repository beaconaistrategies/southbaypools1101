// Standalone seed endpoint using Pool + WebSocket (same as main app)
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "DATABASE_URL not configured" });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const client = await pool.connect();

    try {
      // Create enums and tables if they don't exist
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE contest_status AS ENUM ('open', 'locked');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        DO $$ BEGIN
          CREATE TYPE square_status AS ENUM ('available', 'taken', 'disabled');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        DO $$ BEGIN
          CREATE TYPE operator_plan AS ENUM ('free', 'basic', 'pro');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        DO $$ BEGIN
          CREATE TYPE operator_status AS ENUM ('active', 'suspended', 'trial');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'member', 'trial');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;

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
          q1_winner text,
          q2_winner text,
          q3_winner text,
          q4_winner text,
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
      `);

      // Find or create operator
      let result = await client.query(
        `SELECT id FROM operators WHERE slug = 'south-bay-pools' LIMIT 1`
      );
      let operatorId: string;

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

      // Check if contest already exists
      const existing = await client.query(
        `SELECT id FROM contests WHERE slug = 'super-bowl-lxi' AND operator_id = $1 LIMIT 1`,
        [operatorId]
      );
      if (existing.rows.length > 0) {
        client.release();
        await pool.end();
        return res.json({ message: "Contest already exists", contestId: existing.rows[0].id, slug: "super-bowl-lxi" });
      }

      // Generate shuffled digits
      function shuffledDigits(): number[] {
        const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      const topAxisNumbers = [shuffledDigits(), shuffledDigits(), shuffledDigits(), shuffledDigits()];
      const leftAxisNumbers = [shuffledDigits(), shuffledDigits(), shuffledDigits(), shuffledDigits()];

      const prizes = [
        { label: 'Q1 Winner', amount: '$250', layerIndex: 0 },
        { label: 'Q2 Winner', amount: '$250', layerIndex: 1 },
        { label: 'Q3 Winner', amount: '$250', layerIndex: 2 },
        { label: 'Q4 / Final Winner', amount: '$750', layerIndex: 3 },
      ];

      // Create the contest
      const contestResult = await client.query(
        `INSERT INTO contests (
          id, operator_id, name, slug, event_date, top_team, left_team, notes,
          top_axis_numbers, left_axis_numbers, layer_labels, red_rows_count,
          header_colors_enabled, layer_colors, status, prizes, winners
        ) VALUES (
          gen_random_uuid(), $1, 'Super Bowl LXI Squares', 'super-bowl-lxi',
          '2027-02-14', 'Chiefs', '49ers',
          'Test contest - $25 per square. Q1: $250, Q2: $250, Q3: $250, Q4: $750.',
          $2::jsonb, $3::jsonb, '["Q1","Q2","Q3","Q4"]'::jsonb, 4,
          true, '["#ef4444","#3b82f6","#22c55e","#f59e0b"]'::jsonb, 'open',
          $4::jsonb, '[]'::jsonb
        ) RETURNING id`,
        [operatorId, JSON.stringify(topAxisNumbers), JSON.stringify(leftAxisNumbers), JSON.stringify(prizes)]
      );
      const contestId = contestResult.rows[0].id;

      // Create 100 squares
      const sampleNames = [
        'Mike T.', 'Sarah J.', 'Dave R.', 'Lisa M.', 'Chris P.',
        'Anna K.', 'Tom B.', 'Jenny W.', 'Rick S.', 'Nicole H.',
        'Brandon L.', 'Katie F.', 'James D.', 'Megan C.', 'Steve A.',
      ];

      let taken = 0, available = 0, disabled = 0;

      for (let i = 0; i < 100; i++) {
        const index = i + 1;
        const row = Math.floor(i / 10);
        const col = i % 10;
        const rand = Math.random();

        if (rand < 0.35) {
          const name = sampleNames[Math.floor(Math.random() * sampleNames.length)];
          const email = `${name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`;
          await client.query(
            `INSERT INTO squares (id, contest_id, index, row, col, status, entry_name, holder_name, holder_email)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 'taken', $5, $6, $7)`,
            [contestId, index, row, col, name, name, email]
          );
          taken++;
        } else if (rand > 0.95) {
          await client.query(
            `INSERT INTO squares (id, contest_id, index, row, col, status)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 'disabled')`,
            [contestId, index, row, col]
          );
          disabled++;
        } else {
          await client.query(
            `INSERT INTO squares (id, contest_id, index, row, col, status)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 'available')`,
            [contestId, index, row, col]
          );
          available++;
        }
      }

      client.release();
      await pool.end();

      return res.status(201).json({
        message: 'Test Football Squares contest created',
        contestId,
        slug: 'super-bowl-lxi',
        squares: { taken, available, disabled },
      });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error: any) {
    try { await pool.end(); } catch (_) {}
    console.error('Seed error:', error);
    return res.status(500).json({ error: 'Failed to seed contest', details: error.message });
  }
}
