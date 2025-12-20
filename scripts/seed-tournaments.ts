import { db } from '../server/db';
import { golfTournaments } from '../shared/schema';

const tournaments = [
  { name: "Sony Open in Hawaii", startDate: "2025-01-15T00:00:00.000Z", endDate: "2025-01-18T00:00:00.000Z", season: 2025, weekNumber: 1 },
  { name: "The American Express", startDate: "2025-01-22T00:00:00.000Z", endDate: "2025-01-25T00:00:00.000Z", season: 2025, weekNumber: 2 },
  { name: "Farmers Insurance Open", startDate: "2025-01-29T00:00:00.000Z", endDate: "2025-02-01T00:00:00.000Z", season: 2025, weekNumber: 3 },
  { name: "WM Phoenix Open", startDate: "2025-02-05T00:00:00.000Z", endDate: "2025-02-08T00:00:00.000Z", season: 2025, weekNumber: 4 },
  { name: "AT&T Pebble Beach Pro-Am", startDate: "2025-02-12T00:00:00.000Z", endDate: "2025-02-15T00:00:00.000Z", season: 2025, weekNumber: 5 },
  { name: "The Genesis Invitational", startDate: "2025-02-19T00:00:00.000Z", endDate: "2025-02-22T00:00:00.000Z", season: 2025, weekNumber: 6 },
  { name: "Cognizant Classic", startDate: "2025-02-26T00:00:00.000Z", endDate: "2025-03-01T00:00:00.000Z", season: 2025, weekNumber: 7 },
  { name: "Arnold Palmer Invitational pres. by Mastercard", startDate: "2025-03-05T00:00:00.000Z", endDate: "2025-03-08T00:00:00.000Z", season: 2025, weekNumber: 8 },
  { name: "Puerto Rico Open", startDate: "2025-03-05T00:00:00.000Z", endDate: "2025-03-08T00:00:00.000Z", season: 2025, weekNumber: 8 },
  { name: "THE PLAYERS Championship", startDate: "2025-03-12T00:00:00.000Z", endDate: "2025-03-15T00:00:00.000Z", season: 2025, weekNumber: 9 },
  { name: "Valspar Championship", startDate: "2025-03-19T00:00:00.000Z", endDate: "2025-03-22T00:00:00.000Z", season: 2025, weekNumber: 10 },
  { name: "Texas Children's Houston Open", startDate: "2025-03-26T00:00:00.000Z", endDate: "2025-03-29T00:00:00.000Z", season: 2025, weekNumber: 11 },
  { name: "Valero Texas Open", startDate: "2025-04-02T00:00:00.000Z", endDate: "2025-04-05T00:00:00.000Z", season: 2025, weekNumber: 12 },
  { name: "Masters Tournament", startDate: "2025-04-09T00:00:00.000Z", endDate: "2025-04-12T00:00:00.000Z", season: 2025, weekNumber: 13 },
  { name: "RBC Heritage", startDate: "2025-04-16T00:00:00.000Z", endDate: "2025-04-19T00:00:00.000Z", season: 2025, weekNumber: 14 },
  { name: "Zurich Classic of New Orleans", startDate: "2025-04-23T00:00:00.000Z", endDate: "2025-04-26T00:00:00.000Z", season: 2025, weekNumber: 15 },
  { name: "Cadillac Championship", startDate: "2025-04-30T00:00:00.000Z", endDate: "2025-05-03T00:00:00.000Z", season: 2025, weekNumber: 16 },
  { name: "Truist Championship", startDate: "2025-05-07T00:00:00.000Z", endDate: "2025-05-10T00:00:00.000Z", season: 2025, weekNumber: 17 },
  { name: "ONEflight Myrtle Beach Classic", startDate: "2025-05-07T00:00:00.000Z", endDate: "2025-05-10T00:00:00.000Z", season: 2025, weekNumber: 17 },
  { name: "PGA Championship", startDate: "2025-05-14T00:00:00.000Z", endDate: "2025-05-17T00:00:00.000Z", season: 2025, weekNumber: 18 },
  { name: "THE CJ CUP Byron Nelson", startDate: "2025-05-21T00:00:00.000Z", endDate: "2025-05-24T00:00:00.000Z", season: 2025, weekNumber: 19 },
  { name: "Charles Schwab Challenge", startDate: "2025-05-28T00:00:00.000Z", endDate: "2025-05-31T00:00:00.000Z", season: 2025, weekNumber: 20 },
  { name: "the Memorial Tournament pres. by Workday", startDate: "2025-06-04T00:00:00.000Z", endDate: "2025-06-07T00:00:00.000Z", season: 2025, weekNumber: 21 },
  { name: "RBC Canadian Open", startDate: "2025-06-11T00:00:00.000Z", endDate: "2025-06-14T00:00:00.000Z", season: 2025, weekNumber: 22 },
  { name: "U.S. Open", startDate: "2025-06-18T00:00:00.000Z", endDate: "2025-06-21T00:00:00.000Z", season: 2025, weekNumber: 23 },
  { name: "Travelers Championship", startDate: "2025-06-25T00:00:00.000Z", endDate: "2025-06-28T00:00:00.000Z", season: 2025, weekNumber: 24 },
  { name: "John Deere Classic", startDate: "2025-07-02T00:00:00.000Z", endDate: "2025-07-05T00:00:00.000Z", season: 2025, weekNumber: 25 },
  { name: "Genesis Scottish Open", startDate: "2025-07-09T00:00:00.000Z", endDate: "2025-07-12T00:00:00.000Z", season: 2025, weekNumber: 26 },
  { name: "ISCO Championship", startDate: "2025-07-09T00:00:00.000Z", endDate: "2025-07-12T00:00:00.000Z", season: 2025, weekNumber: 26 },
  { name: "The Open Championship", startDate: "2025-07-16T00:00:00.000Z", endDate: "2025-07-19T00:00:00.000Z", season: 2025, weekNumber: 27 },
  { name: "Corales Puntacana Championship", startDate: "2025-07-16T00:00:00.000Z", endDate: "2025-07-19T00:00:00.000Z", season: 2025, weekNumber: 27 },
  { name: "3M Open", startDate: "2025-07-23T00:00:00.000Z", endDate: "2025-07-26T00:00:00.000Z", season: 2025, weekNumber: 28 },
  { name: "Rocket Classic", startDate: "2025-07-30T00:00:00.000Z", endDate: "2025-08-02T00:00:00.000Z", season: 2025, weekNumber: 29 },
  { name: "Wyndham Championship", startDate: "2025-08-06T00:00:00.000Z", endDate: "2025-08-09T00:00:00.000Z", season: 2025, weekNumber: 30 },
  { name: "FedEx St. Jude Championship", startDate: "2025-08-13T00:00:00.000Z", endDate: "2025-08-16T00:00:00.000Z", season: 2025, weekNumber: 31 },
  { name: "BMW Championship", startDate: "2025-08-20T00:00:00.000Z", endDate: "2025-08-23T00:00:00.000Z", season: 2025, weekNumber: 32 },
  { name: "TOUR Championship", startDate: "2025-08-27T00:00:00.000Z", endDate: "2025-08-30T00:00:00.000Z", season: 2025, weekNumber: 33 },
];

async function seedTournaments() {
  console.log('Seeding golf tournaments...');
  
  for (const t of tournaments) {
    await db.insert(golfTournaments).values({
      name: t.name,
      startDate: new Date(t.startDate),
      endDate: new Date(t.endDate),
      season: t.season,
      weekNumber: t.weekNumber,
    });
    console.log(`  Added: ${t.name}`);
  }
  
  console.log(`\nSeeded ${tournaments.length} tournaments`);
  process.exit(0);
}

seedTournaments().catch(console.error);
