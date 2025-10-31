import type { Contest, Square } from "@shared/schema";

export function exportContestToCSV(contest: Contest, squares: Square[]): void {
  const csvRows: string[] = [];

  // Add contest header information
  csvRows.push(`Contest: ${contest.name}`);
  csvRows.push(`Teams: ${contest.topTeam} vs ${contest.leftTeam}`);
  csvRows.push(`Date: ${new Date(contest.eventDate).toLocaleDateString()}`);
  csvRows.push(`Status: ${contest.status}`);
  csvRows.push('');

  // Add participants section
  csvRows.push('PARTICIPANTS');
  csvRows.push('Square #,Entry Name,Holder Name,Holder Email,Status');
  
  const sortedSquares = [...squares].sort((a, b) => a.index - b.index);
  
  sortedSquares.forEach((square) => {
    if (square.status === 'taken') {
      const row = [
        square.index,
        escapeCSV(square.entryName || ''),
        escapeCSV(square.holderName || ''),
        escapeCSV(square.holderEmail || ''),
        square.status
      ].join(',');
      csvRows.push(row);
    }
  });

  csvRows.push('');

  // Add prizes section
  if (contest.prizes && contest.prizes.length > 0) {
    csvRows.push('PRIZES');
    csvRows.push('Label,Amount');
    
    contest.prizes.forEach((prize) => {
      const row = [
        escapeCSV(prize.label),
        escapeCSV(prize.amount)
      ].join(',');
      csvRows.push(row);
    });

    csvRows.push('');
  }

  // Add winners section
  if (contest.winners && contest.winners.length > 0) {
    csvRows.push('WINNERS');
    csvRows.push('Prize,Square #,Entry Name');
    
    contest.winners.forEach((winner) => {
      const square = squares.find(s => s.index === winner.squareNumber);
      const row = [
        escapeCSV(winner.label),
        winner.squareNumber,
        escapeCSV(square?.entryName || '')
      ].join(',');
      csvRows.push(row);
    });

    csvRows.push('');
  }

  // Add grid numbers section
  csvRows.push('GRID NUMBERS');
  csvRows.push('Axis,Layer,Numbers');
  
  contest.topAxisNumbers.forEach((layer, index) => {
    const label = contest.layerLabels?.[index] || `Layer ${index + 1}`;
    csvRows.push(`Top,${escapeCSV(label)},${layer.join('-')}`);
  });
  
  contest.leftAxisNumbers.forEach((layer, index) => {
    const label = contest.layerLabels?.[index] || `Layer ${index + 1}`;
    csvRows.push(`Left,${escapeCSV(label)},${layer.join('-')}`);
  });

  // Create and download the CSV file
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizeFilename(contest.name)}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}
