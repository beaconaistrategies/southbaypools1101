import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), 'attached_assets/Untitled_spreadsheet_-_Sheet1_(3)_1766247123651.csv');

function parseMonthDay(str: string, year: number): Date {
  const months: { [key: string]: number } = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const parts = str.trim().split(' ');
  const month = months[parts[0]];
  const day = parseInt(parts[1]);
  
  return new Date(year, month, day);
}

function parseDateRange(dateStr: string): { startDate: Date; endDate: Date } {
  const year = 2025;
  
  if (dateStr.includes(' - ')) {
    const parts = dateStr.split(' - ');
    const startPart = parts[0].trim();
    const endPart = parts[1].trim();
    
    let startDate: Date;
    let endDate: Date;
    
    if (startPart.match(/^[A-Za-z]+/)) {
      startDate = parseMonthDay(startPart, year);
      
      if (endPart.match(/^[A-Za-z]+/)) {
        endDate = parseMonthDay(endPart, year);
      } else {
        const startMonth = startDate.getMonth();
        endDate = new Date(year, startMonth, parseInt(endPart));
      }
    } else {
      startDate = new Date(year, 0, parseInt(startPart));
      endDate = new Date(year, 0, parseInt(endPart));
    }
    
    return { startDate, endDate };
  }
  
  const date = parseMonthDay(dateStr, year);
  return { startDate: date, endDate: date };
}

function parseCsv(content: string): Array<{ name: string; startDate: string; endDate: string; season: number; weekNumber: number }> {
  const lines = content.split('\n');
  const tournaments: Array<{ name: string; startDate: string; endDate: string; season: number; weekNumber: number }> = [];
  
  let currentDates = '';
  let currentTournament = '';
  let weekNumber = 1;
  let lastDates = '';
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line.trim()) continue;
    
    if (line.match(/^[A-Z][a-z]+ \d/)) {
      if (currentDates && currentTournament) {
        const { startDate, endDate } = parseDateRange(currentDates);
        const name = currentTournament.split('\n')[0].trim();
        
        if (currentDates !== lastDates) {
          weekNumber++;
        }
        lastDates = currentDates;
        
        tournaments.push({
          name,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          season: 2025,
          weekNumber
        });
      }
      
      const match = line.match(/^([^,]+),(.+)/);
      if (match) {
        currentDates = match[1].trim();
        currentTournament = match[2].replace(/^"/, '').replace(/"$/, '');
      }
    } else if (line.includes('"')) {
      currentTournament += '\n' + line.replace(/"/g, '');
    }
  }
  
  if (currentDates && currentTournament) {
    const { startDate, endDate } = parseDateRange(currentDates);
    const name = currentTournament.split('\n')[0].trim();
    
    if (currentDates !== lastDates) {
      weekNumber++;
    }
    
    tournaments.push({
      name,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      season: 2025,
      weekNumber
    });
  }
  
  return tournaments;
}

const content = fs.readFileSync(csvPath, 'utf-8');
const tournaments = parseCsv(content);

console.log(JSON.stringify({ tournaments }, null, 2));
