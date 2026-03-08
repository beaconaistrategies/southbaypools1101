// Standalone seed endpoint using raw SQL - no schema imports needed
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "DATABASE_URL not configured" });
  }

  // Remove channel_binding parameter as it's not supported via HTTP
  const dbUrl = process.env.DATABASE_URL.replace(/[&?]channel_binding=[^&]*/g, '');
  const sql = neon(dbUrl);

  try {
    // Find or create operator
    let rows = await sql`SELECT id FROM operators WHERE slug = 'south-bay-pools' LIMIT 1`;
    let operatorId: string;

    if (rows.length === 0) {
      const created = await sql`
        INSERT INTO operators (id, name, slug, plan, status, max_contests)
        VALUES (gen_random_uuid(), 'South Bay Pools', 'south-bay-pools', 'free', 'active', 10)
        RETURNING id
      `;
      operatorId = created[0].id;
    } else {
      operatorId = rows[0].id;
    }

    // Check if contest already exists
    const existing = await sql`
      SELECT id FROM contests WHERE slug = 'super-bowl-lxi' AND operator_id = ${operatorId} LIMIT 1
    `;
    if (existing.length > 0) {
      return res.json({ message: "Contest already exists", contestId: existing[0].id, slug: "super-bowl-lxi" });
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
    const contestResult = await sql`
      INSERT INTO contests (
        id, operator_id, name, slug, event_date, top_team, left_team, notes,
        top_axis_numbers, left_axis_numbers, layer_labels, red_rows_count,
        header_colors_enabled, layer_colors, status, prizes, winners
      ) VALUES (
        gen_random_uuid(), ${operatorId}, 'Super Bowl LXI Squares', 'super-bowl-lxi',
        '2027-02-14', 'Chiefs', '49ers',
        'Test contest - $25 per square. Q1: $250, Q2: $250, Q3: $250, Q4: $750.',
        ${JSON.stringify(topAxisNumbers)}::jsonb, ${JSON.stringify(leftAxisNumbers)}::jsonb,
        '["Q1","Q2","Q3","Q4"]'::jsonb, 4,
        true, '["#ef4444","#3b82f6","#22c55e","#f59e0b"]'::jsonb, 'open',
        ${JSON.stringify(prizes)}::jsonb, '[]'::jsonb
      ) RETURNING id
    `;
    const contestId = contestResult[0].id;

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
        await sql`
          INSERT INTO squares (id, contest_id, index, row, col, status, entry_name, holder_name, holder_email)
          VALUES (gen_random_uuid(), ${contestId}, ${index}, ${row}, ${col}, 'taken', ${name}, ${name}, ${email})
        `;
        taken++;
      } else if (rand > 0.95) {
        await sql`
          INSERT INTO squares (id, contest_id, index, row, col, status)
          VALUES (gen_random_uuid(), ${contestId}, ${index}, ${row}, ${col}, 'disabled')
        `;
        disabled++;
      } else {
        await sql`
          INSERT INTO squares (id, contest_id, index, row, col, status)
          VALUES (gen_random_uuid(), ${contestId}, ${index}, ${row}, ${col}, 'available')
        `;
        available++;
      }
    }

    return res.status(201).json({
      message: 'Test Football Squares contest created',
      contestId,
      slug: 'super-bowl-lxi',
      squares: { taken, available, disabled },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: 'Failed to seed contest', details: error.message });
  }
}
