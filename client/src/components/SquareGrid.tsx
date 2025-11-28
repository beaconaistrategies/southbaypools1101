import { useState, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import type { Winner, Prize } from "@shared/schema";

interface Square {
  index: number;
  row: number;
  col: number;
  status: "available" | "taken" | "disabled";
  entryName?: string | null;
  holderName?: string | null;
  holderEmail?: string | null;
}

interface SquareGridProps {
  topTeam: string;
  leftTeam: string;
  topAxisNumbers: number[][];
  leftAxisNumbers: number[][];
  layerLabels?: string[];
  showRedHeaders?: boolean;
  headerColorsEnabled?: boolean;
  layerColors?: string[];
  squares: Square[];
  prizes?: Prize[];
  winners?: Winner[];
  onSquareClick?: (square: Square) => void;
  readOnly?: boolean;
}

export default function SquareGrid({
  topTeam,
  leftTeam,
  topAxisNumbers,
  leftAxisNumbers,
  layerLabels,
  showRedHeaders = false,
  headerColorsEnabled = true,
  layerColors,
  squares,
  prizes = [],
  winners = [],
  onSquareClick,
  readOnly = false
}: SquareGridProps) {
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  const redHeadersCount = topAxisNumbers.length;

  // Default colors for layers
  const defaultColors = ["#fda4af", "#93c5fd", "#fcd34d", "#6ee7b7", "#c084fc", "#67e8f9"];

  // Convert hex color to Tailwind-compatible background style
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "0, 0, 0";
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  };

  // Get layer color with customization support
  const getLayerColor = (layerIdx: number): string => {
    if (!headerColorsEnabled) {
      return ""; // No color when disabled
    }
    
    // Use custom colors if provided, otherwise use defaults
    const colorHex = layerColors?.[layerIdx] || defaultColors[layerIdx] || defaultColors[0];
    return `bg-[${colorHex}]/80`;
  };

  // Get layer color as inline style (for custom hex colors)
  const getLayerStyle = (layerIdx: number): React.CSSProperties => {
    if (!headerColorsEnabled) {
      return {};
    }
    
    const colorHex = layerColors?.[layerIdx] || defaultColors[layerIdx] || defaultColors[0];
    const rgb = hexToRgb(colorHex);
    return {
      backgroundColor: `rgba(${rgb}, 0.8)`,
    };
  };

  // Get badge style that matches layer color (darker shade for badges)
  const getLayerBadgeStyle = (layerIdx: number): React.CSSProperties => {
    if (!headerColorsEnabled) {
      return {}; // Use default badge styling when colors disabled
    }
    
    const colorHex = layerColors?.[layerIdx] || defaultColors[layerIdx] || defaultColors[0];
    // Darken the color for badges (reduce lightness by converting to darker shade)
    const rgb = hexToRgb(colorHex);
    const [r, g, b] = rgb.split(', ').map(v => parseInt(v));
    // Darken by multiplying by 0.6
    const darkRgb = `${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)}`;
    return {
      backgroundColor: `rgb(${darkRgb})`,
      color: 'white',
    };
  };

  // Extract just the period part from a prize label (e.g., "GB @ DET Q1" -> "Q1")
  const extractPeriodLabel = (fullLabel: string): string => {
    // Known period keywords to look for
    const periods = ["Q1", "Q2", "Q3", "Q4", "HALF", "FINAL"];
    const upperLabel = fullLabel.toUpperCase();
    
    // Check for opposite variants first
    for (const period of periods) {
      if (upperLabel.includes(`${period} OPP`) || upperLabel.includes(`${period} OPPOSITE`)) {
        return `${period} Opp`;
      }
    }
    
    // Check for standard periods
    for (const period of periods) {
      if (upperLabel.includes(period)) {
        return period;
      }
    }
    
    // Fallback: return the original label
    return fullLabel;
  };

  // Check if a square is a winner and get its prize index
  const getWinnerInfo = (squareNumber: number): { label: string; displayLabel: string; prizeIndex: number; colorIndex: number } | undefined => {
    const winner = winners.find(w => w.squareNumber === squareNumber);
    if (!winner) return undefined;
    
    const prizeIndex = prizes.findIndex(p => p.label === winner.label);
    const safePrizeIndex = prizeIndex >= 0 ? prizeIndex : 0;
    
    // Determine color index based on board type:
    // - Multi-game boards (>8 prizes): group by game (8 prizes per game), each game gets one color
    // - Single-game boards (≤8 prizes): each prize gets its own color (Q1=0, Q2=1, etc.)
    const isMultiGameBoard = prizes.length > 8;
    const colorIndex = isMultiGameBoard 
      ? Math.floor(safePrizeIndex / 8)  // Multi-game: all 8 prizes per game share same color
      : safePrizeIndex;                  // Single-game: each prize has unique color
    
    return {
      label: winner.label,
      displayLabel: extractPeriodLabel(winner.label),
      prizeIndex: safePrizeIndex,
      colorIndex
    };
  };

  const getSquare = (row: number, col: number): Square | undefined => {
    return squares.find(s => s.row === row && s.col === col);
  };

  const handleSquareClick = (square: Square) => {
    if (square.status === "disabled") return;
    if (readOnly) return;
    onSquareClick?.(square);
  };

  const renderSquareContent = (square: Square) => {
    const isAvailable = square.status === "available";
    const isTaken = square.status === "taken";
    const isDisabled = square.status === "disabled";
    const winnerInfo = getWinnerInfo(square.index);
    const isWinner = !!winnerInfo;
    
    const baseClasses = "relative flex flex-col items-center justify-center min-h-[50px] border text-center transition-all";
    const cursorClass = readOnly || isDisabled ? "cursor-default" : "cursor-pointer";
    
    // Winner squares use layer color matching the prize
    const borderClass = isWinner ? "border-2" : "border-border";
    const bgClass = !isWinner 
      ? (isTaken ? "bg-muted" : isDisabled ? "bg-muted/40" : "bg-background")
      : "";
    const hoverClass = !readOnly && (isAvailable || isTaken) ? "hover-elevate active-elevate-2" : "";
    
    // Get inline style for winner background - use colorIndex for proper color coordination
    const winnerStyle = isWinner ? getLayerStyle(winnerInfo.colorIndex) : {};
    
    return (
      <div 
        className={`${baseClasses} ${cursorClass} ${bgClass} ${borderClass} ${hoverClass}`}
        style={winnerStyle}
        onClick={() => handleSquareClick(square)}
        onMouseEnter={() => setHoveredSquare(square.index)}
        onMouseLeave={() => setHoveredSquare(null)}
        data-testid={`square-${square.index}`}
      >
        <span className="absolute top-1 left-1 text-xs font-mono text-muted-foreground">
          {square.index}
        </span>
        {isWinner && (
          <Badge 
            variant="default" 
            className="absolute top-1 right-1 text-xs"
            style={getLayerBadgeStyle(winnerInfo.colorIndex)}
          >
            {winnerInfo.displayLabel}
          </Badge>
        )}
        {isTaken && square.entryName && (
          <span className="text-xs font-medium px-2 text-center break-words hyphens-auto leading-tight">
            {square.entryName}
          </span>
        )}
        {isDisabled && (
          <span className="text-xs text-muted-foreground line-through">—</span>
        )}
      </div>
    );
  };

  // Calculate total columns: redHeadersCount (left labels) + 10 (data columns)
  const totalCols = redHeadersCount + 10;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 items-center">
        {/* Team 1 (topTeam) - vertical from bottom to top */}
        <div className="flex-shrink-0" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span className="text-5xl font-bold tracking-wide">
            {topTeam}
          </span>
        </div>

        <div className="flex-1">
          {/* Team 2 (leftTeam) - horizontal above grid */}
          <div className="flex items-center justify-center mb-4">
            <span className="text-5xl font-bold tracking-wide">
              {leftTeam}
            </span>
          </div>

          {/* Grid container - dynamic columns based on redHeadersCount */}
          <div 
            className="grid gap-0" 
            style={{ 
              gridTemplateColumns: `repeat(${redHeadersCount}, minmax(60px, 80px)) repeat(10, minmax(50px, 1fr))` 
            }}
          >
            {/* Top-left corner: redHeadersCount x redHeadersCount area */}
            {/* Labels placed diagonally - Q1 at (1,1), Q2 at (2,2), Q3 at (3,3), etc. */}
            {/* Colors: entire row 0 and column 0 are Layer 0 color, creating L-shaped color bands */}
            {Array.from({ length: redHeadersCount }).map((_, rowIdx) => (
              <Fragment key={`corner-row-${rowIdx + 1}`}>
                {Array.from({ length: redHeadersCount }).map((_, colIdx) => {
                  const isDiagonal = rowIdx === colIdx;
                  const label = isDiagonal ? layerLabels?.[rowIdx] : null;
                  // Use min(rowIdx, colIdx) so row 0 and column 0 are both Layer 0 color
                  const layerIndex = Math.min(rowIdx, colIdx);
                  
                  return (
                    <div 
                      key={`corner-cell-${rowIdx + 1}-${colIdx + 1}`}
                      className="border border-border flex items-center justify-center min-h-[50px]"
                      style={{
                        gridColumn: `${colIdx + 1} / span 1`,
                        gridRow: `${rowIdx + 1} / span 1`,
                        ...getLayerStyle(layerIndex)
                      }}
                      data-testid={isDiagonal ? `corner-layer-${rowIdx}` : undefined}
                    >
                      {label && (
                        <span className="text-lg font-mono font-bold">
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}

            {/* Top header numbers - render all layers */}
            {Array.from({ length: redHeadersCount }).map((_, rowIdx) => (
              <Fragment key={`top-header-row-${rowIdx}`}>
                {topAxisNumbers[rowIdx].map((num, colIdx) => (
                  <div 
                    key={`top-header-${rowIdx}-${colIdx}`}
                    className="border border-border flex items-center justify-center min-h-[50px]"
                    style={getLayerStyle(rowIdx)}
                    data-testid={`header-top-layer${rowIdx}-col${colIdx}`}
                  >
                    {showRedHeaders && (
                      <span className="text-sm font-mono font-semibold">{num}</span>
                    )}
                  </div>
                ))}
              </Fragment>
            ))}

            {/* Grid rows: 10 data rows */}
            {Array.from({ length: 10 }).map((_, rowIdx) => (
              <Fragment key={`row-${rowIdx}`}>
                {/* Left header numbers for this row (one column per layer) */}
                {Array.from({ length: redHeadersCount }).map((_, layerIdx) => (
                  <div 
                    key={`left-header-${layerIdx}-${rowIdx}`}
                    className="border border-border flex flex-col items-center justify-center min-h-[50px] gap-1"
                    style={getLayerStyle(layerIdx)}
                    data-testid={`header-left-layer${layerIdx}-row${rowIdx}`}
                  >
                    {showRedHeaders && (
                      <span className="text-sm font-mono font-semibold">
                        {leftAxisNumbers[layerIdx][rowIdx]}
                      </span>
                    )}
                  </div>
                ))}
              
                {/* Data squares: 10 columns */}
                {Array.from({ length: 10 }).map((_, colIdx) => {
                  const square = getSquare(rowIdx, colIdx);
                  return square ? (
                    <div key={`square-${rowIdx}-${colIdx}`}>
                      {renderSquareContent(square)}
                    </div>
                  ) : null;
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
