import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Shuffle } from "lucide-react";
import SquareSelector from "./SquareSelector";

interface ContestFormProps {
  initialData?: {
    name: string;
    eventDate: string;
    topTeam: string;
    leftTeam: string;
    notes: string;
    topAxisNumbers: number[];
    leftAxisNumbers: number[];
    redRowsCount: number;
    redColsCount: number;
    redRows: number[];
    redCols: number[];
    isOpen: boolean;
    availableSquares: number[];
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function ContestForm({ initialData, onSubmit, onCancel }: ContestFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [eventDate, setEventDate] = useState(initialData?.eventDate || "");
  const [topTeam, setTopTeam] = useState(initialData?.topTeam || "");
  const [leftTeam, setLeftTeam] = useState(initialData?.leftTeam || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [topAxisNumbers, setTopAxisNumbers] = useState<number[]>(
    initialData?.topAxisNumbers || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  );
  const [leftAxisNumbers, setLeftAxisNumbers] = useState<number[]>(
    initialData?.leftAxisNumbers || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  );
  const [redRowsCount, setRedRowsCount] = useState(initialData?.redRowsCount || 2);
  const [redColsCount, setRedColsCount] = useState(initialData?.redColsCount || 2);
  const [redRows, setRedRows] = useState<number[]>(initialData?.redRows || [0, 1]);
  const [redCols, setRedCols] = useState<number[]>(initialData?.redCols || [0, 1]);
  const [isOpen, setIsOpen] = useState(initialData?.isOpen ?? true);
  const [availableSquares, setAvailableSquares] = useState<number[]>(
    initialData?.availableSquares || Array.from({ length: 100 }, (_, i) => i + 1)
  );

  const shuffleArray = (arr: number[]) => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const handleShuffleTop = () => {
    setTopAxisNumbers(shuffleArray(topAxisNumbers));
  };

  const handleShuffleLeft = () => {
    setLeftAxisNumbers(shuffleArray(leftAxisNumbers));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      eventDate,
      topTeam,
      leftTeam,
      notes,
      topAxisNumbers,
      leftAxisNumbers,
      redRowsCount,
      redColsCount,
      redRows,
      redCols,
      isOpen,
      availableSquares
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Contest Details</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Contest Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Week 8: SF vs DAL"
              required
              data-testid="input-contest-name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topTeam">
                Top Team <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topTeam"
                value={topTeam}
                onChange={(e) => setTopTeam(e.target.value)}
                placeholder="San Francisco"
                required
                data-testid="input-top-team"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leftTeam">
                Left Team <span className="text-destructive">*</span>
              </Label>
              <Input
                id="leftTeam"
                value={leftTeam}
                onChange={(e) => setLeftTeam(e.target.value)}
                placeholder="Dallas"
                required
                data-testid="input-left-team"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">
              Event Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              data-testid="input-event-date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information about the contest"
              rows={3}
              data-testid="input-notes"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Axis Numbers (0-9)</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Top Axis</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShuffleTop}
                data-testid="button-shuffle-top"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Randomize
              </Button>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {topAxisNumbers.map((num, idx) => (
                <Input
                  key={idx}
                  value={num}
                  onChange={(e) => {
                    const newNums = [...topAxisNumbers];
                    newNums[idx] = parseInt(e.target.value) || 0;
                    setTopAxisNumbers(newNums);
                  }}
                  className="text-center font-mono"
                  type="number"
                  min="0"
                  max="9"
                  data-testid={`input-top-axis-${idx}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Left Axis</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShuffleLeft}
                data-testid="button-shuffle-left"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Randomize
              </Button>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {leftAxisNumbers.map((num, idx) => (
                <Input
                  key={idx}
                  value={num}
                  onChange={(e) => {
                    const newNums = [...leftAxisNumbers];
                    newNums[idx] = parseInt(e.target.value) || 0;
                    setLeftAxisNumbers(newNums);
                  }}
                  className="text-center font-mono"
                  type="number"
                  min="0"
                  max="9"
                  data-testid={`input-left-axis-${idx}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Red Headers</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redRowsCount">Red Rows (1-4)</Label>
              <Input
                id="redRowsCount"
                type="number"
                min="1"
                max="4"
                value={redRowsCount}
                onChange={(e) => setRedRowsCount(parseInt(e.target.value) || 1)}
                data-testid="input-red-rows-count"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redColsCount">Red Columns (1-4)</Label>
              <Input
                id="redColsCount"
                type="number"
                min="1"
                max="4"
                value={redColsCount}
                onChange={(e) => setRedColsCount(parseInt(e.target.value) || 1)}
                data-testid="input-red-cols-count"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Red Rows (indices 0-9)</Label>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: 10 }).map((_, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant={redRows.includes(idx) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (redRows.includes(idx)) {
                      setRedRows(redRows.filter(r => r !== idx));
                    } else if (redRows.length < redRowsCount) {
                      setRedRows([...redRows, idx]);
                    }
                  }}
                  className="font-mono"
                  data-testid={`button-red-row-${idx}`}
                >
                  {idx}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Red Columns (indices 0-9)</Label>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: 10 }).map((_, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant={redCols.includes(idx) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (redCols.includes(idx)) {
                      setRedCols(redCols.filter(c => c !== idx));
                    } else if (redCols.length < redColsCount) {
                      setRedCols([...redCols, idx]);
                    }
                  }}
                  className="font-mono"
                  data-testid={`button-red-col-${idx}`}
                >
                  {idx}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Square Availability</h3>
        <SquareSelector
          selectedSquares={availableSquares}
          onSelectionChange={setAvailableSquares}
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="isOpen" className="text-base">Open for Picks</Label>
            <p className="text-sm text-muted-foreground">
              Allow entrants to claim squares
            </p>
          </div>
          <Switch
            id="isOpen"
            checked={isOpen}
            onCheckedChange={setIsOpen}
            data-testid="switch-is-open"
          />
        </div>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-save">
          Save Contest
        </Button>
      </div>
    </form>
  );
}
