import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Prize, Winner } from "@shared/schema";

interface WinnersPanelProps {
  prizes?: Prize[];
  winners?: Winner[];
  onUpdate?: (winners: Winner[]) => void;
  readOnly?: boolean;
}

export default function WinnersPanel({
  prizes = [],
  winners = [],
  onUpdate,
  readOnly = false
}: WinnersPanelProps) {
  const handleSquareNumberChange = (label: string, value: string) => {
    if (!onUpdate) return;
    
    const squareNumber = parseInt(value) || 0;
    const existingWinnerIndex = winners.findIndex(w => w.label === label);
    
    let newWinners = [...winners];
    
    if (squareNumber > 0 && squareNumber <= 100) {
      if (existingWinnerIndex >= 0) {
        newWinners[existingWinnerIndex] = { label, squareNumber };
      } else {
        newWinners.push({ label, squareNumber });
      }
    } else {
      if (existingWinnerIndex >= 0) {
        newWinners = newWinners.filter(w => w.label !== label);
      }
    }
    
    onUpdate(newWinners);
  };

  const getSquareNumberForPrize = (label: string): number => {
    const winner = winners.find(w => w.label === label);
    return winner?.squareNumber || 0;
  };

  const getPrizeAmount = (label: string): string => {
    const prize = prizes.find(p => p.label === label);
    return prize?.amount || "";
  };

  if (prizes.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Winners</h3>
        <p className="text-sm text-muted-foreground">
          No prizes configured yet. Add prize payouts in the admin panel.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Winners</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {prizes.map((prize) => {
          const squareNumber = getSquareNumberForPrize(prize.label);
          
          return (
            <div key={prize.label} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`winner-${prize.label}`} className="text-sm font-medium">
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
                  data-testid={`text-winner-${prize.label}`}
                >
                  {squareNumber > 0 ? `#${squareNumber}` : "—"}
                </div>
              ) : (
                <Input
                  id={`winner-${prize.label}`}
                  type="number"
                  min="1"
                  max="100"
                  value={squareNumber > 0 ? squareNumber : ""}
                  onChange={(e) => handleSquareNumberChange(prize.label, e.target.value)}
                  placeholder="Square #"
                  className="text-center font-mono"
                  data-testid={`input-winner-${prize.label}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
