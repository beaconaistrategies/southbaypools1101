import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Prize, Winner, Square } from "@shared/schema";

const defaultColors = ["#fda4af", "#93c5fd", "#fcd34d", "#6ee7b7", "#c084fc", "#67e8f9"];

const PERIOD_LABELS_8 = ["Q1", "HALF", "Q3", "FINAL", "Q1 Opposite", "HALF Opposite", "Q3 Opposite", "FINAL Opposite"];
const PERIOD_LABELS_4 = ["Q1", "HALF", "Q3", "FINAL"];
const PERIOD_LABELS_5 = ["Q1", "Q2", "HALF", "Q3", "FINAL"];

interface WinnersPanelProps {
  prizes?: Prize[];
  winners?: Winner[];
  squares?: Square[];
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
  squares = [],
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

  const getWinnerName = (squareNumber: number): string | null => {
    if (squareNumber <= 0) return null;
    const square = squares.find(s => s.index === squareNumber);
    return square?.entryName || null;
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

  // Determine if this is a multi-game setup
  // Use layer labels count as primary indicator of number of games
  // Then calculate prizes per game dynamically
  const numGamesFromLabels = layerLabels.length;
  
  // Detect multi-game: either has layer labels OR has more than 8 prizes
  const isMultiGame = numGamesFromLabels > 1 || prizes.length > 8;
  
  // Calculate prizes per game based on available information
  let prizesPerGame: number;
  let numGames: number;
  
  if (numGamesFromLabels > 1) {
    // Use layer labels to determine game count
    numGames = numGamesFromLabels;
    prizesPerGame = Math.floor(prizes.length / numGames);
  } else if (prizes.length > 8) {
    // Try common divisors: 8, 5, 4
    if (prizes.length % 8 === 0) {
      prizesPerGame = 8;
      numGames = prizes.length / 8;
    } else if (prizes.length % 5 === 0) {
      prizesPerGame = 5;
      numGames = prizes.length / 5;
    } else if (prizes.length % 4 === 0) {
      prizesPerGame = 4;
      numGames = prizes.length / 4;
    } else {
      prizesPerGame = prizes.length;
      numGames = 1;
    }
  } else {
    prizesPerGame = prizes.length;
    numGames = 1;
  }
  
  // Use multi-game layout if we have multiple games
  const useMultiGameLayout = isMultiGame && numGames > 1 && prizesPerGame >= 4;
  
  // Get period labels based on prizes per game
  const getPeriodLabels = (): string[] => {
    if (prizesPerGame === 8) return PERIOD_LABELS_8;
    if (prizesPerGame === 5) return PERIOD_LABELS_5;
    if (prizesPerGame === 4) return PERIOD_LABELS_4;
    return Array.from({ length: prizesPerGame }, (_, i) => `Prize ${i + 1}`);
  };
  
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
                  className="text-lg font-bold text-center py-2 bg-muted/50 rounded border"
                  data-testid={`text-winner-${index}`}
                >
                  {squareNumber > 0 ? (getWinnerName(squareNumber) || `#${squareNumber}`) : "—"}
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

  // Get the period labels for this board configuration
  const periodLabels = getPeriodLabels();

  // Build games array from actual prizes
  const games = Array.from({ length: numGames }, (_, gameIndex) => {
    const startIdx = gameIndex * prizesPerGame;
    const gamePrizes = prizes.slice(startIdx, startIdx + prizesPerGame);
    
    // Try to get game name from layer labels or derive from first prize label
    let gameName = layerLabels[gameIndex];
    if (!gameName && gamePrizes.length > 0) {
      // Try to extract game name from prize label (e.g., "GB @ DET Q1" -> "GB @ DET")
      const firstPrizeLabel = gamePrizes[0].label;
      const periodMatch = periodLabels.find((p: string) => firstPrizeLabel.endsWith(p) || firstPrizeLabel.endsWith(` ${p}`));
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
                const globalIndex = game.index * prizesPerGame + periodIndex;
                const squareNumber = getSquareNumberForPrize(prize.label);
                const uniqueId = `winner-${globalIndex}-${prize.label.replace(/\s+/g, '-')}`;
                const periodLabel = periodLabels[periodIndex] || prize.label;
                
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
                        className="text-sm font-bold text-center py-1.5 bg-muted/50 rounded border truncate px-1"
                        data-testid={`text-winner-${globalIndex}`}
                        title={squareNumber > 0 ? `#${squareNumber}: ${getWinnerName(squareNumber) || 'Unknown'}` : undefined}
                      >
                        {squareNumber > 0 ? (getWinnerName(squareNumber) || `#${squareNumber}`) : "—"}
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
                No prizes configured for this game. Add {prizesPerGame} prizes ({periodLabels.join(", ")}) in the Prize Payouts section above.
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
