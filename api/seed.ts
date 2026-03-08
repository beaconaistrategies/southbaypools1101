// Standalone seed endpoint - creates a test Football Squares contest
// This bypasses the full Express app initialization
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { operators, contests, squares } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

neonConfig.webSocketConstructor = ws;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "DATABASE_URL not configured" });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    // Find or create operator
    let [operator] = await db.select().from(operators).where(eq(operators.slug, 'south-bay-pools'));
    if (!operator) {
      [operator] = await db.insert(operators).values({
        name: 'South Bay Pools',
        slug: 'south-bay-pools',
        plan: 'free',
        status: 'active',
        maxContests: 10,
      }).returning();
    }

    // Check if contest already exists
    const [existing] = await db.select().from(contests)
      .where(and(eq(contests.slug, 'super-bowl-lxi'), eq(contests.operatorId, operator.id)));
    if (existing) {
      await pool.end();
      return res.json({ message: "Contest already exists", contestId: existing.id, slug: "super-bowl-lxi" });
    }

    // Generate shuffled digits for axis numbers
    function shuffledDigits(): number[] {
      const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    const redRowsCount = 4;
    const topAxisNumbers = Array.from({ length: redRowsCount }, () => shuffledDigits());
    const leftAxisNumbers = Array.from({ length: redRowsCount }, () => shuffledDigits());

    const [contest] = await db.insert(contests).values({
      operatorId: operator.id,
      name: 'Super Bowl LXI Squares',
      slug: 'super-bowl-lxi',
      eventDate: new Date('2027-02-14'),
      topTeam: 'Chiefs',
      leftTeam: '49ers',
      notes: 'Test contest - $25 per square. Q1: $250, Q2: $250, Q3: $250, Q4: $750.',
      topAxisNumbers,
      leftAxisNumbers,
      layerLabels: ['Q1', 'Q2', 'Q3', 'Q4'],
      redRowsCount,
      headerColorsEnabled: true,
      layerColors: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'],
      status: 'open',
      prizes: [
        { label: 'Q1 Winner', amount: '$250', layerIndex: 0 },
        { label: 'Q2 Winner', amount: '$250', layerIndex: 1 },
        { label: 'Q3 Winner', amount: '$250', layerIndex: 2 },
        { label: 'Q4 / Final Winner', amount: '$750', layerIndex: 3 },
      ],
      winners: [],
    }).returning();

    // Create 100 squares
    const sampleNames = [
      'Mike T.', 'Sarah J.', 'Dave R.', 'Lisa M.', 'Chris P.',
      'Anna K.', 'Tom B.', 'Jenny W.', 'Rick S.', 'Nicole H.',
      'Brandon L.', 'Katie F.', 'James D.', 'Megan C.', 'Steve A.',
    ];

    const squaresToCreate = Array.from({ length: 100 }, (_, i) => {
      const index = i + 1;
      const row = Math.floor(i / 10);
      const col = i % 10;
      const rand = Math.random();

      if (rand < 0.35) {
        const name = sampleNames[Math.floor(Math.random() * sampleNames.length)];
        return {
          contestId: contest.id,
          index,
          row,
          col,
          status: 'taken' as const,
          entryName: name,
          holderName: name,
          holderEmail: `${name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
        };
      } else if (rand > 0.95) {
        return { contestId: contest.id, index, row, col, status: 'disabled' as const };
      } else {
        return { contestId: contest.id, index, row, col, status: 'available' as const };
      }
    });

    await db.insert(squares).values(squaresToCreate);

    const taken = squaresToCreate.filter(s => s.status === 'taken').length;
    const available = squaresToCreate.filter(s => s.status === 'available').length;
    const disabled = squaresToCreate.filter(s => s.status === 'disabled').length;

    await pool.end();

    return res.status(201).json({
      message: 'Test Football Squares contest created',
      contestId: contest.id,
      slug: 'super-bowl-lxi',
      squares: { taken, available, disabled },
    });
  } catch (error: any) {
    await pool.end();
    console.error('Seed error:', error);
    return res.status(500).json({ error: 'Failed to seed contest', details: error.message });
  }
}
