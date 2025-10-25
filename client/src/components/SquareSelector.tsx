import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SquareSelectorProps {
  selectedSquares: number[];
  onSelectionChange: (squares: number[]) => void;
}

export default function SquareSelector({
  selectedSquares,
  onSelectionChange
}: SquareSelectorProps) {
  const allSquares = Array.from({ length: 100 }, (_, i) => i + 1);

  const toggleSquare = (squareNum: number) => {
    if (selectedSquares.includes(squareNum)) {
      onSelectionChange(selectedSquares.filter(s => s !== squareNum));
    } else {
      onSelectionChange([...selectedSquares, squareNum]);
    }
  };

  const selectAll = () => {
    onSelectionChange(allSquares);
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Available Squares ({selectedSquares.length}/100)
        </Label>
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={selectAll}
            data-testid="button-select-all"
          >
            Select All
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={deselectAll}
            data-testid="button-deselect-all"
          >
            Deselect All
          </Button>
        </div>
      </div>
      
      <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {allSquares.map(num => (
            <div 
              key={num} 
              className="flex items-center space-x-2 border rounded px-2 py-1 hover-elevate"
            >
              <Checkbox
                id={`square-${num}`}
                checked={selectedSquares.includes(num)}
                onCheckedChange={() => toggleSquare(num)}
                data-testid={`checkbox-square-${num}`}
              />
              <Label
                htmlFor={`square-${num}`}
                className="text-xs font-mono cursor-pointer flex-1"
              >
                {num}
              </Label>
            </div>
          ))}
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Unchecked squares will not be available for entrants to claim
      </p>
    </div>
  );
}
