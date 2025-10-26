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
  topAxisNumbers: number[];
  leftAxisNumbers: number[];
  redRows: number[];
  redCols: number[];
  squares: Square[];
  onSquareClick?: (square: Square) => void;
  readOnly?: boolean;
}

export default function SquareGrid({
  topTeam,
  leftTeam,
  topAxisNumbers,
  leftAxisNumbers,
  redRows,
  redCols,
  squares,
  onSquareClick,
  readOnly = false
}: SquareGridProps) {
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  const getSquare = (row: number, col: number): Square | undefined => {
    return squares.find(s => s.row === row && s.col === col);
  };

  const isRedHeader = (type: 'row' | 'col', index: number) => {
    return type === 'row' ? redRows.includes(index) : redCols.includes(index);
  };

  const isRandomized = (numbers: number[]) => {
    const defaultOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    return !numbers.every((num, idx) => num === defaultOrder[idx]);
  };

  const topRandomized = isRandomized(topAxisNumbers);
  const leftRandomized = isRandomized(leftAxisNumbers);

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

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Grid container with 11x11 (1 header row/col + 10 data) */}
        <div className="grid grid-cols-11 gap-0" style={{ gridTemplateColumns: 'minmax(60px, 80px) repeat(10, minmax(50px, 1fr))' }}>
          {/* Top-left corner */}
          <div className="border border-border bg-card flex items-center justify-center min-h-[50px]">
            <span className="text-xs font-medium text-muted-foreground text-center px-2">
              {topTeam}
            </span>
          </div>
          
          {/* Top axis numbers */}
          {topAxisNumbers.map((num, idx) => {
            const isRed = isRedHeader('col', idx);
            const showNumber = !isRed || topRandomized;
            return (
              <div 
                key={`top-${idx}`}
                className={`border border-border flex items-center justify-center min-h-[50px] ${
                  isRed ? 'bg-destructive text-destructive-foreground' : 'bg-card'
                }`}
                data-testid={`header-top-${idx}`}
              >
                {showNumber && <span className="text-sm font-mono font-semibold">{num}</span>}
              </div>
            );
          })}
          
          {/* Grid rows */}
          {Array.from({ length: 10 }).map((_, rowIdx) => {
            const isRed = isRedHeader('row', rowIdx);
            const showNumber = !isRed || leftRandomized;
            return (
              <Fragment key={`row-${rowIdx}`}>
                {/* Left axis number */}
                <div 
                  className={`border border-border flex items-center justify-center min-h-[50px] ${
                    isRed ? 'bg-destructive text-destructive-foreground' : 'bg-card'
                  }`}
                  data-testid={`header-left-${rowIdx}`}
                >
                  {showNumber && <span className="text-sm font-mono font-semibold">{leftAxisNumbers[rowIdx]}</span>}
                </div>
              
                {/* Data squares */}
                {Array.from({ length: 10 }).map((_, colIdx) => {
                  const square = getSquare(rowIdx, colIdx);
                  return square ? (
                    <div key={`square-${rowIdx}-${colIdx}`}>
                      {renderSquareContent(square)}
                    </div>
                  ) : null;
                })}
              </Fragment>
            );
          })}
        </div>
        
        {/* Left team label (rotated) */}
        <div className="flex items-center justify-center mt-4">
          <span className="text-xs font-medium text-muted-foreground">{leftTeam}</span>
        </div>
      </div>
    </div>
  );
}
