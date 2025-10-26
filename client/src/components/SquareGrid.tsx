import { useState, Fragment } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  onSquareClick,
  readOnly = false
}: SquareGridProps) {
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  const redHeadersCount = topAxisNumbers.length;

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
    
    const baseClasses = "relative flex flex-col items-center justify-center min-h-[50px] border border-border text-center transition-all";
    const cursorClass = readOnly || isDisabled ? "cursor-default" : (isAvailable ? "cursor-pointer" : "cursor-default");
    const bgClass = isTaken 
      ? "bg-muted" 
      : isDisabled 
        ? "bg-muted/40" 
        : "bg-background";
    const hoverClass = !readOnly && isAvailable ? "hover-elevate active-elevate-2" : "";
    
    const content = (
      <div 
        className={`${baseClasses} ${cursorClass} ${bgClass} ${hoverClass}`}
        onClick={() => handleSquareClick(square)}
        onMouseEnter={() => setHoveredSquare(square.index)}
        onMouseLeave={() => setHoveredSquare(null)}
        data-testid={`square-${square.index}`}
      >
        <span className="absolute top-1 left-1 text-xs font-mono text-muted-foreground">
          {square.index}
        </span>
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
      <div className="flex gap-4 items-start">
        {/* Left team name - vertical from bottom to top */}
        <div className="flex-shrink-0" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span className="text-2xl font-bold tracking-wide">
            {leftTeam}
          </span>
        </div>

        <div className="flex-1">
          {/* Top team name - horizontal above grid */}
          <div className="flex items-center justify-center mb-2">
            <span className="text-2xl font-bold tracking-wide">
              {topTeam}
            </span>
          </div>

          {/* Grid container - dynamic columns based on redHeadersCount */}
          <div 
            className="grid gap-0" 
            style={{ 
              gridTemplateColumns: `repeat(${redHeadersCount}, minmax(60px, 80px)) repeat(10, minmax(50px, 1fr))` 
            }}
          >
            {/* Top-left corner: redHeadersCount x redHeadersCount pink area */}
            {Array.from({ length: redHeadersCount }).map((_, rowIdx) => (
              <Fragment key={`corner-row-${rowIdx}`}>
                {Array.from({ length: redHeadersCount }).map((_, colIdx) => (
                  <div 
                    key={`corner-${rowIdx}-${colIdx}`}
                    className="border border-border bg-destructive/20 flex items-center justify-center min-h-[50px]"
                    data-testid={`corner-${rowIdx}-${colIdx}`}
                  >
                    {/* Show layer labels in corner cells if they intersect */}
                    {rowIdx === colIdx && (
                      <span className="text-xs font-mono font-semibold">
                        {topLayerLabels?.[rowIdx] || leftLayerLabels?.[colIdx] || `L${rowIdx + 1}`}
                      </span>
                    )}
                  </div>
                ))}
                
                {/* Top header numbers for this layer */}
                {topAxisNumbers[rowIdx].map((num, colIdx) => (
                  <div 
                    key={`top-header-${rowIdx}-${colIdx}`}
                    className="border border-border bg-destructive/20 flex items-center justify-center min-h-[50px]"
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
                    className="border border-border bg-destructive/20 flex items-center justify-center min-h-[50px]"
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
