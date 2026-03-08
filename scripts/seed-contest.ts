import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { operators, contests, squares } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function seed() {
  console.log('Seeding test Football Squares contest...');

  // Find or create the operator
  let [operator] = await db.select().from(operators).where(eq(operators.slug, 'south-bay-pools'));

  if (!operator) {
    console.log('Creating operator "South Bay Pools"...');
    [operator] = await db.insert(operators).values({
      name: 'South Bay Pools',
      slug: 'south-bay-pools',
      plan: 'free',
      status: 'active',
      maxContests: 10,
    }).returning();
  }

  console.log(`Operator: ${operator.name} (${operator.id})`);

  // Generate random axis numbers (0-9 shuffled) for 4 layers (Q1-Q4)
  function shuffledDigits(): number[] {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const redRowsCount = 4; // 4 layers: Q1, Q2, Q3, Q4
  const topAxisNumbers = Array.from({ length: redRowsCount }, () => shuffledDigits());
  const leftAxisNumbers = Array.from({ length: redRowsCount }, () => shuffledDigits());

  // Create the contest - Super Bowl themed
  const [contest] = await db.insert(contests).values({
    operatorId: operator.id,
    name: 'Super Bowl LXI Squares',
    slug: 'super-bowl-lxi',
    eventDate: new Date('2027-02-14'),
    topTeam: 'Chiefs',
    leftTeam: '49ers',
    notes: 'Test contest - $25 per square. Q1: $250, Q2: $250, Q3: $250, Q4: $750. Pick your squares!',
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

  console.log(`Contest created: ${contest.name} (${contest.id})`);

  // Create 100 squares - mix of available, taken, and a few disabled
  const sampleNames = [
    'Mike T.', 'Sarah J.', 'Dave R.', 'Lisa M.', 'Chris P.',
    'Anna K.', 'Tom B.', 'Jenny W.', 'Rick S.', 'Nicole H.',
    'Brandon L.', 'Katie F.', 'James D.', 'Megan C.', 'Steve A.',
  ];

  const squaresToCreate = Array.from({ length: 100 }, (_, i) => {
    const index = i + 1;
    const row = Math.floor(i / 10);
    const col = i % 10;

    // ~35 squares taken, ~60 available, ~5 disabled
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
      return {
        contestId: contest.id,
        index,
        row,
        col,
        status: 'disabled' as const,
      };
    } else {
      return {
        contestId: contest.id,
        index,
        row,
        col,
        status: 'available' as const,
      };
    }
  });

  await db.insert(squares).values(squaresToCreate);

  const takenCount = squaresToCreate.filter(s => s.status === 'taken').length;
  const availableCount = squaresToCreate.filter(s => s.status === 'available').length;
  const disabledCount = squaresToCreate.filter(s => s.status === 'disabled').length;

  console.log(`Created 100 squares: ${takenCount} taken, ${availableCount} available, ${disabledCount} disabled`);
  console.log(`\nContest URL: /super-bowl-lxi`);
  console.log('Done!');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
