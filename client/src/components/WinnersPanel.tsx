import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Prize, Winner } from "@shared/schema";

interface WinnersPanelProps {
  prizes?: Prize[];
  winners?: Winner[];
  onUpdate?: (winners: Winner[]) => void;
  readOnly?: boolean;
  showCard?: boolean;
}

export default function WinnersPanel({
  prizes = [],
  winners = [],
  onUpdate,
  readOnly = false,
  showCard = true
}: WinnersPanelProps) {
  const handleSquareNumberChange = (index: number, label: string, value: string) => {
    if (!onUpdate) return;
    
    const squareNumber = parseInt(value) || 0;
    
    let newWinners = [...winners];
    
    if (squareNumber > 0 && squareNumber <= 100) {
      const existingIndex = newWinners.findIndex((w, i) => w.label === label && i === winners.findIndex(win => win.label === label));
      if (existingIndex >= 0) {
        newWinners[existingIndex] = { label, squareNumber };
      } else {
        const existingLabelIndex = newWinners.findIndex(w => w.label === label);
        if (existingLabelIndex >= 0) {
          newWinners[existingLabelIndex] = { label, squareNumber };
        } else {
          newWinners.push({ label, squareNumber });
        }
      }
    } else {
      newWinners = newWinners.filter(w => w.label !== label);
    }
    
    onUpdate(newWinners);
  };

  const getSquareNumberForPrize = (label: string): number => {
    const winner = winners.find(w => w.label === label);
    return winner?.squareNumber || 0;
  };

  if (prizes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No prizes configured yet. Add prize payouts in the contest settings above.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {prizes.map((prize, index) => {
        const squareNumber = getSquareNumberForPrize(prize.label);
        const uniqueId = `winner-${index}-${prize.label.replace(/\s+/g, '-')}`;
        
        return (
          <div key={`prize-${index}`} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={uniqueId} className="text-sm font-medium">
                {prize.label}
              </Label>
              {prize.amount && (
                <Badge variant="secondary" className="text-xs">
                  ${prize.amount}
                </Badge>
              )}
            </div>
            {readOnly ? (
              <div 
                className="text-2xl font-bold font-mono text-center py-2 bg-muted/50 rounded border"
                data-testid={`text-winner-${index}`}
              >
                {squareNumber > 0 ? `#${squareNumber}` : "—"}
              </div>
            ) : (
              <Input
                id={uniqueId}
                name={uniqueId}
                type="number"
                min="1"
                max="100"
                value={squareNumber > 0 ? squareNumber : ""}
                onChange={(e) => handleSquareNumberChange(index, prize.label, e.target.value)}
                placeholder="Square #"
                className="text-center font-mono"
                data-testid={`input-winner-${index}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
