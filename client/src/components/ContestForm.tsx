import { useState, useEffect } from "react";
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
    topAxisNumbers: number[][];
    leftAxisNumbers: number[][];
    topLayerLabels?: string[];
    leftLayerLabels?: string[];
    redRowsCount: number;
    status: string;
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
  const [redRowsCount, setRedRowsCount] = useState(initialData?.redRowsCount || 2);
  
  // Initialize nested arrays based on redRowsCount
  const generateDefaultLayers = (count: number): number[][] => {
    return Array.from({ length: count }, () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  };
  
  const [topAxisNumbers, setTopAxisNumbers] = useState<number[][]>(
    initialData?.topAxisNumbers || generateDefaultLayers(redRowsCount)
  );
  const [leftAxisNumbers, setLeftAxisNumbers] = useState<number[][]>(
    initialData?.leftAxisNumbers || generateDefaultLayers(redRowsCount)
  );
  const [topLayerLabels, setTopLayerLabels] = useState<string[]>(
    initialData?.topLayerLabels || []
  );
  const [leftLayerLabels, setLeftLayerLabels] = useState<string[]>(
    initialData?.leftLayerLabels || []
  );
  const [isOpen, setIsOpen] = useState(initialData?.status === "open" || initialData?.status === undefined);
  const [availableSquares, setAvailableSquares] = useState<number[]>(
    initialData?.availableSquares || Array.from({ length: 100 }, (_, i) => i + 1)
  );

  // When redRowsCount changes, update the nested arrays
  useEffect(() => {
    const currentLayers = topAxisNumbers.length;
    if (currentLayers !== redRowsCount) {
      // Adjust top axis layers
      const newTopLayers = [...topAxisNumbers];
      if (redRowsCount > currentLayers) {
        // Add new layers
        for (let i = currentLayers; i < redRowsCount; i++) {
          newTopLayers.push([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        }
      } else {
        // Remove excess layers
        newTopLayers.splice(redRowsCount);
      }
      setTopAxisNumbers(newTopLayers);

      // Adjust left axis layers
      const newLeftLayers = [...leftAxisNumbers];
      if (redRowsCount > currentLayers) {
        for (let i = currentLayers; i < redRowsCount; i++) {
          newLeftLayers.push([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        }
      } else {
        newLeftLayers.splice(redRowsCount);
      }
      setLeftAxisNumbers(newLeftLayers);
    }
  }, [redRowsCount]);

  const shuffleArray = (arr: number[]) => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const handleShuffleTopLayer = (layerIdx: number) => {
    const newLayers = [...topAxisNumbers];
    newLayers[layerIdx] = shuffleArray(newLayers[layerIdx]);
    setTopAxisNumbers(newLayers);
  };

  const handleShuffleLeftLayer = (layerIdx: number) => {
    const newLayers = [...leftAxisNumbers];
    newLayers[layerIdx] = shuffleArray(newLayers[layerIdx]);
    setLeftAxisNumbers(newLayers);
  };

  const handleShuffleAllTop = () => {
    const newLayers = topAxisNumbers.map(layer => shuffleArray(layer));
    setTopAxisNumbers(newLayers);
  };

  const handleShuffleAllLeft = () => {
    const newLayers = leftAxisNumbers.map(layer => shuffleArray(layer));
    setLeftAxisNumbers(newLayers);
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
      topLayerLabels: topLayerLabels.filter(l => l.trim()),
      leftLayerLabels: leftLayerLabels.filter(l => l.trim()),
      redRowsCount,
      status: isOpen ? "open" : "locked",
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
                Team 1 (Column Header) <span className="text-destructive">*</span>
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
                Team 2 (Row Header) <span className="text-destructive">*</span>
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
        <h3 className="text-lg font-semibold mb-4">Red Headers</h3>
        <div className="space-y-2">
          <Label htmlFor="redRowsCount">Number of Red Headers (1-6)</Label>
          <Input
            id="redRowsCount"
            type="number"
            min="1"
            max="6"
            value={redRowsCount}
            onChange={(e) => {
              const count = Math.min(6, Math.max(1, parseInt(e.target.value) || 1));
              setRedRowsCount(count);
            }}
            data-testid="input-red-rows-count"
          />
          <p className="text-sm text-muted-foreground">
            Determines how many sets of 0-9 numbers appear on each axis (for Q1, Q2, Q3, Q4, etc.)
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Top Axis Number Layers</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShuffleAllTop}
            data-testid="button-shuffle-all-top"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle All
          </Button>
        </div>
        
        <div className="space-y-6">
          {topAxisNumbers.map((layer, layerIdx) => (
            <div key={layerIdx} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Layer {layerIdx + 1} (e.g., Q{layerIdx + 1})</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShuffleTopLayer(layerIdx)}
                  data-testid={`button-shuffle-top-layer-${layerIdx}`}
                >
                  <Shuffle className="h-3 w-3 mr-1" />
                  Shuffle
                </Button>
              </div>
              <Input
                value={topLayerLabels[layerIdx] || ""}
                onChange={(e) => {
                  const newLabels = [...topLayerLabels];
                  newLabels[layerIdx] = e.target.value;
                  setTopLayerLabels(newLabels);
                }}
                placeholder={`Layer ${layerIdx + 1} label (optional)`}
                className="mb-2"
                data-testid={`input-top-layer-label-${layerIdx}`}
              />
              <div className="grid grid-cols-10 gap-2">
                {layer.map((num, numIdx) => (
                  <Input
                    key={numIdx}
                    value={num}
                    onChange={(e) => {
                      const newLayers = [...topAxisNumbers];
                      newLayers[layerIdx][numIdx] = Math.min(9, Math.max(0, parseInt(e.target.value) || 0));
                      setTopAxisNumbers(newLayers);
                    }}
                    className="text-center font-mono"
                    type="number"
                    min="0"
                    max="9"
                    data-testid={`input-top-layer${layerIdx}-num${numIdx}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Left Axis Number Layers</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShuffleAllLeft}
            data-testid="button-shuffle-all-left"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle All
          </Button>
        </div>
        
        <div className="space-y-6">
          {leftAxisNumbers.map((layer, layerIdx) => (
            <div key={layerIdx} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Layer {layerIdx + 1} (e.g., Q{layerIdx + 1})</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShuffleLeftLayer(layerIdx)}
                  data-testid={`button-shuffle-left-layer-${layerIdx}`}
                >
                  <Shuffle className="h-3 w-3 mr-1" />
                  Shuffle
                </Button>
              </div>
              <Input
                value={leftLayerLabels[layerIdx] || ""}
                onChange={(e) => {
                  const newLabels = [...leftLayerLabels];
                  newLabels[layerIdx] = e.target.value;
                  setLeftLayerLabels(newLabels);
                }}
                placeholder={`Layer ${layerIdx + 1} label (optional)`}
                className="mb-2"
                data-testid={`input-left-layer-label-${layerIdx}`}
              />
              <div className="grid grid-cols-10 gap-2">
                {layer.map((num, numIdx) => (
                  <Input
                    key={numIdx}
                    value={num}
                    onChange={(e) => {
                      const newLayers = [...leftAxisNumbers];
                      newLayers[layerIdx][numIdx] = Math.min(9, Math.max(0, parseInt(e.target.value) || 0));
                      setLeftAxisNumbers(newLayers);
                    }}
                    className="text-center font-mono"
                    type="number"
                    min="0"
                    max="9"
                    data-testid={`input-left-layer${layerIdx}-num${numIdx}`}
                  />
                ))}
              </div>
            </div>
          ))}
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
