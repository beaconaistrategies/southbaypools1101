import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Prize, Winner } from "@shared/schema";

const defaultColors = ["#fda4af", "#93c5fd", "#fcd34d", "#6ee7b7", "#c084fc", "#67e8f9"];

const PERIODS_PER_GAME = 8;
const PERIOD_LABELS = ["Q1", "HALF", "Q3", "FINAL", "Q1 Opposite", "HALF Opposite", "Q3 Opposite", "FINAL Opposite"];

interface WinnersPanelProps {
  prizes?: Prize[];
  winners?: Winner[];
  onUpdate?: (winners: Winner[]) => void;
  readOnly?: boolean;
  layerLabels?: string[];
  layerColors?: string[];
  headerColorsEnabled?: boolean;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0, 0, 0";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export default function WinnersPanel({
  prizes = [],
  winners = [],
  onUpdate,
  readOnly = false,
  layerLabels = [],
  layerColors = [],
  headerColorsEnabled = true
}: WinnersPanelProps) {
  const handleSquareNumberChange = (prizeLabel: string, value: string) => {
    if (!onUpdate) return;
    
    const squareNumber = parseInt(value) || 0;
    let newWinners = [...winners];
    
    if (squareNumber > 0 && squareNumber <= 100) {
      const existingIndex = newWinners.findIndex(w => w.label === prizeLabel);
      if (existingIndex >= 0) {
        newWinners[existingIndex] = { label: prizeLabel, squareNumber };
      } else {
        newWinners.push({ label: prizeLabel, squareNumber });
      }
    } else {
      newWinners = newWinners.filter(w => w.label !== prizeLabel);
    }
    
    onUpdate(newWinners);
  };

  const getSquareNumberForPrize = (label: string): number => {
    const winner = winners.find(w => w.label === label);
    return winner?.squareNumber || 0;
  };

  const getGameColor = (gameIndex: number): string => {
    if (!headerColorsEnabled) return "";
    return layerColors[gameIndex] || defaultColors[gameIndex] || defaultColors[0];
  };

  const getGameHeaderStyle = (gameIndex: number): React.CSSProperties => {
    if (!headerColorsEnabled) return {};
    const colorHex = getGameColor(gameIndex);
    const rgb = hexToRgb(colorHex);
    return {
      backgroundColor: `rgba(${rgb}, 0.3)`,
      borderColor: `rgba(${rgb}, 0.6)`,
    };
  };

  const getGameBorderStyle = (gameIndex: number): React.CSSProperties => {
    if (!headerColorsEnabled) return {};
    const colorHex = getGameColor(gameIndex);
    const rgb = hexToRgb(colorHex);
    return {
      borderColor: `rgba(${rgb}, 0.4)`,
    };
  };

  if (prizes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No prizes configured yet. Add prize payouts in the contest settings above.
      </div>
    );
  }

  // Determine if this is a multi-game setup based on ACTUAL prizes, not just layer labels
  // A valid multi-game setup requires: prizes divisible by 8 AND at least 2 games worth
  const isValidMultiGame = prizes.length >= PERIODS_PER_GAME * 2 && prizes.length % PERIODS_PER_GAME === 0;
  const numGamesFromPrizes = Math.floor(prizes.length / PERIODS_PER_GAME);
  const numGames = isValidMultiGame ? numGamesFromPrizes : 1;
  
  // Only use layer labels if they match the number of games from prizes
  const useMultiGameLayout = isValidMultiGame && (layerLabels.length === 0 || layerLabels.length === numGamesFromPrizes);
  
  if (!useMultiGameLayout) {
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
                  onChange={(e) => handleSquareNumberChange(prize.label, e.target.value)}
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

  // Build games array from actual prizes
  const games = Array.from({ length: numGames }, (_, gameIndex) => {
    const startIdx = gameIndex * PERIODS_PER_GAME;
    const gamePrizes = prizes.slice(startIdx, startIdx + PERIODS_PER_GAME);
    
    // Try to get game name from layer labels or derive from first prize label
    let gameName = layerLabels[gameIndex];
    if (!gameName && gamePrizes.length > 0) {
      // Try to extract game name from prize label (e.g., "GB @ DET Q1" -> "GB @ DET")
      const firstPrizeLabel = gamePrizes[0].label;
      const periodMatch = PERIOD_LABELS.find(p => firstPrizeLabel.endsWith(p) || firstPrizeLabel.endsWith(` ${p}`));
      if (periodMatch) {
        gameName = firstPrizeLabel.replace(new RegExp(`\\s*${periodMatch}$`), '').trim();
      }
    }
    gameName = gameName || `Game ${gameIndex + 1}`;
    
    return {
      index: gameIndex,
      name: gameName,
      prizes: gamePrizes,
      color: getGameColor(gameIndex)
    };
  });

  return (
    <div className="space-y-6">
      {games.map((game) => (
        <Card 
          key={`game-${game.index}`} 
          className="p-4 border-2"
          style={getGameBorderStyle(game.index)}
        >
          <div 
            className="flex items-center gap-3 mb-4 p-3 rounded-lg border"
            style={getGameHeaderStyle(game.index)}
          >
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: game.color }}
            />
            <h4 className="font-semibold text-lg">{game.name}</h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {game.prizes.length > 0 ? (
              game.prizes.map((prize, periodIndex) => {
                const globalIndex = game.index * PERIODS_PER_GAME + periodIndex;
                const squareNumber = getSquareNumberForPrize(prize.label);
                const uniqueId = `winner-${globalIndex}-${prize.label.replace(/\s+/g, '-')}`;
                const periodLabel = PERIOD_LABELS[periodIndex] || prize.label;
                
                return (
                  <div key={`prize-${globalIndex}`} className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <Label htmlFor={uniqueId} className="text-xs font-medium truncate">
                        {periodLabel}
                      </Label>
                      {prize.amount && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          ${prize.amount}
                        </Badge>
                      )}
                    </div>
                    {readOnly ? (
                      <div 
                        className="text-lg font-bold font-mono text-center py-1.5 bg-muted/50 rounded border"
                        data-testid={`text-winner-${globalIndex}`}
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
                        onChange={(e) => handleSquareNumberChange(prize.label, e.target.value)}
                        placeholder="#"
                        className="text-center font-mono h-9"
                        data-testid={`input-winner-${globalIndex}`}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-4 text-sm text-muted-foreground text-center py-4">
                No prizes configured for this game. Add {PERIODS_PER_GAME} prizes ({PERIOD_LABELS.join(", ")}) in the Prize Payouts section above.
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
