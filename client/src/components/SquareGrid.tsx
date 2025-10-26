import { useState, Fragment } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { Winner } from "@shared/schema";

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
  topLayerLabels?: string[];
  leftLayerLabels?: string[];
  showRedHeaders?: boolean;
  squares: Square[];
  winners?: Winner[];
  onSquareClick?: (square: Square) => void;
  readOnly?: boolean;
}

export default function SquareGrid({
  topTeam,
  leftTeam,
  topAxisNumbers,
  leftAxisNumbers,
  topLayerLabels,
  leftLayerLabels,
  showRedHeaders = false,
  squares,
  winners = [],
  onSquareClick,
  readOnly = false
}: SquareGridProps) {
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  const redHeadersCount = topAxisNumbers.length;

  // Color mapping for different layers - using distinct hues
  const getLayerColor = (layerIdx: number): string => {
    const colors = [
      "bg-rose-200/80 dark:bg-rose-900/40",      // Layer 0: Rose
      "bg-blue-200/80 dark:bg-blue-900/40",      // Layer 1: Blue
      "bg-amber-200/80 dark:bg-amber-900/40",    // Layer 2: Amber
      "bg-emerald-200/80 dark:bg-emerald-900/40", // Layer 3: Emerald
      "bg-purple-200/80 dark:bg-purple-900/40",  // Layer 4: Purple
      "bg-cyan-200/80 dark:bg-cyan-900/40",      // Layer 5: Cyan
    ];
    return colors[layerIdx] || colors[0];
  };

  // Check if a square is a winner
  const getWinnerLabel = (squareNumber: number): string | undefined => {
    const winner = winners.find(w => w.squareNumber === squareNumber);
    return winner?.label;
  };

  const getSquare = (row: number, col: number): Square | undefined => {
    return squares.find(s => s.row === row && s.col === col);
  };

  const handleSquareClick = (square: Square) => {
    if (readOnly || square.status === "disabled") return;
    onSquareClick?.(square);
  };

  const renderSquareContent = (square: Square) => {
    const isAvailable = square.status === "available";
    const isTaken = square.status === "taken";
    const isDisabled = square.status === "disabled";
    const winnerLabel = getWinnerLabel(square.index);
    const isWinner = !!winnerLabel;
    
    const baseClasses = "relative flex flex-col items-center justify-center min-h-[50px] border text-center transition-all";
    const cursorClass = readOnly || isDisabled ? "cursor-default" : (isAvailable ? "cursor-pointer" : "cursor-default");
    
    // Winner squares get special styling with gold border
    const borderClass = isWinner ? "border-2 border-yellow-500 dark:border-yellow-600" : "border-border";
    const bgClass = isWinner
      ? "bg-yellow-100/80 dark:bg-yellow-900/30"
      : isTaken 
        ? "bg-muted" 
        : isDisabled 
          ? "bg-muted/40" 
          : "bg-background";
    const hoverClass = !readOnly && isAvailable ? "hover-elevate active-elevate-2" : "";
    
    const content = (
      <div 
        className={`${baseClasses} ${cursorClass} ${bgClass} ${borderClass} ${hoverClass}`}
        onClick={() => handleSquareClick(square)}
        onMouseEnter={() => setHoveredSquare(square.index)}
        onMouseLeave={() => setHoveredSquare(null)}
        data-testid={`square-${square.index}`}
      >
        <span className="absolute top-1 left-1 text-xs font-mono text-muted-foreground">
          {square.index}
        </span>
        {isWinner && (
          <Badge variant="default" className="absolute top-1 right-1 text-xs bg-yellow-600 hover:bg-yellow-700">
            {winnerLabel}
          </Badge>
        )}
        {isTaken && square.entryName && (
          <span className="text-xs font-medium truncate px-2 max-w-full">
            {square.entryName}
          </span>
        )}
        {isDisabled && (
          <span className="text-xs text-muted-foreground line-through">—</span>
        )}
      </div>
    );

    if (isTaken && square.entryName) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">{square.entryName}</p>
              <p className="text-sm">{square.holderName}</p>
              <p className="text-xs text-muted-foreground">
                {square.holderEmail?.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
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
            {/* Top-left corner: redHeadersCount x redHeadersCount area with merged diagonal cells */}
            {Array.from({ length: redHeadersCount }).map((_, layerIdx) => {
              // Each layer label cell spans from its diagonal position to bottom-right
              const span = redHeadersCount - layerIdx;
              return (
                <div 
                  key={`corner-layer-${layerIdx}`}
                  className={`border border-border ${getLayerColor(layerIdx)} flex items-center justify-center min-h-[50px]`}
                  style={{
                    gridColumn: `${layerIdx + 1} / span ${span}`,
                    gridRow: `${layerIdx + 1} / span ${span}`
                  }}
                  data-testid={`corner-layer-${layerIdx}`}
                >
                  <span className="text-lg font-mono font-bold">
                    {topLayerLabels?.[layerIdx] || leftLayerLabels?.[layerIdx] || `L${layerIdx + 1}`}
                  </span>
                </div>
              );
            })}

            {/* Top header numbers - render all layers */}
            {Array.from({ length: redHeadersCount }).map((_, rowIdx) => (
              <Fragment key={`top-header-row-${rowIdx}`}>
                {topAxisNumbers[rowIdx].map((num, colIdx) => (
                  <div 
                    key={`top-header-${rowIdx}-${colIdx}`}
                    className={`border border-border ${getLayerColor(rowIdx)} flex items-center justify-center min-h-[50px]`}
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
                    className={`border border-border ${getLayerColor(layerIdx)} flex items-center justify-center min-h-[50px]`}
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
