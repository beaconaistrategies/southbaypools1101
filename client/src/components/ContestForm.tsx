import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shuffle, Folder as FolderIcon } from "lucide-react";
import SquareSelector from "./SquareSelector";
import PrizesEditor from "./PrizesEditor";
import type { Prize, Folder } from "@shared/schema";

type PayoutPreset = "quarters" | "halves" | "custom";

interface ContestFormProps {
  initialData?: {
    name: string;
    eventDate: string;
    topTeam: string;
    leftTeam: string;
    notes: string;
    folderId?: string | null;
    topAxisNumbers: number[][];
    leftAxisNumbers: number[][];
    layerLabels?: string[];
    redRowsCount: number;
    status: string;
    availableSquares: number[];
    prizes?: Prize[];
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
  const [webhookUrl, setWebhookUrl] = useState((initialData as any)?.webhookUrl || "");
  const [folderId, setFolderId] = useState<string | null>(initialData?.folderId || null);
  const [redRowsCount, setRedRowsCount] = useState(initialData?.redRowsCount || 2);

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });
  
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
  const [layerLabels, setLayerLabels] = useState<string[]>(
    initialData?.layerLabels || []
  );
  const [isOpen, setIsOpen] = useState(initialData?.status === "open" || initialData?.status === undefined);
  const [availableSquares, setAvailableSquares] = useState<number[]>(
    initialData?.availableSquares || Array.from({ length: 100 }, (_, i) => i + 1)
  );
  const [prizes, setPrizes] = useState<Prize[]>(initialData?.prizes || []);
  const [payoutPreset, setPayoutPreset] = useState<PayoutPreset>("custom");

  // Apply preset configuration
  const applyPreset = (preset: PayoutPreset) => {
    setPayoutPreset(preset);
    
    if (preset === "quarters") {
      setRedRowsCount(4);
      const labels = ["Q1", "Q2", "Q3", "Q4"];
      setLayerLabels(labels);
      setPrizes(labels.map(label => ({ label, amount: "" })));
    } else if (preset === "halves") {
      setRedRowsCount(2);
      const labels = ["Half", "Final"];
      setLayerLabels(labels);
      setPrizes(labels.map(label => ({ label, amount: "" })));
    }
    // "custom" preset doesn't force any changes
  };

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
      webhookUrl: webhookUrl.trim() || undefined,
      folderId: folderId || undefined,
      topAxisNumbers,
      leftAxisNumbers,
      layerLabels: layerLabels.filter(l => l.trim()),
      redRowsCount,
      status: isOpen ? "open" : "locked",
      availableSquares,
      prizes
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

          {folders.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="folder">Folder</Label>
              <Select value={folderId || "none"} onValueChange={(val) => setFolderId(val === "none" ? null : val)}>
                <SelectTrigger id="folder" data-testid="select-folder">
                  <SelectValue placeholder="No Folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <FolderIcon className="h-4 w-4" />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topTeam">
                Team 1 (Vertical) <span className="text-destructive">*</span>
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
                Team 2 (Horizontal) <span className="text-destructive">*</span>
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

          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
            <Input
              id="webhookUrl"
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-webhook.com/..."
              data-testid="input-webhook-url"
            />
            <p className="text-sm text-muted-foreground">
              Enter your n8n webhook URL to send email notifications when participants claim squares. Your n8n workflow can then send confirmation emails via Gmail.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payout Configuration</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payoutPreset">Payout Preset</Label>
            <Select value={payoutPreset} onValueChange={(value) => applyPreset(value as PayoutPreset)}>
              <SelectTrigger id="payoutPreset" data-testid="select-payout-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarters">Quarters (Q1, Q2, Q3, Q4)</SelectItem>
                <SelectItem value="halves">Half and Final</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose a preset to automatically sync layer labels and prize labels. Select "Custom" for full control.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="redRowsCount">Number of Layers {payoutPreset !== "custom" && "(Set by preset)"}</Label>
            <Input
              id="redRowsCount"
              type="number"
              min="1"
              max="6"
              value={redRowsCount}
              onChange={(e) => {
                const count = Math.min(6, Math.max(1, parseInt(e.target.value) || 1));
                setRedRowsCount(count);
                if (payoutPreset !== "custom") {
                  setPayoutPreset("custom");
                }
              }}
              disabled={payoutPreset !== "custom"}
              data-testid="input-red-rows-count"
            />
            <p className="text-sm text-muted-foreground">
              Determines how many payout periods (layers) to track. Each layer gets its own set of 0-9 numbers.
            </p>
          </div>
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
                <div className="flex items-center gap-2">
                  <Label>Layer {layerIdx + 1}</Label>
                  <Input
                    value={layerLabels[layerIdx] || ""}
                    onChange={(e) => {
                      const newLabels = [...layerLabels];
                      newLabels[layerIdx] = e.target.value;
                      setLayerLabels(newLabels);
                      if (payoutPreset !== "custom") {
                        setPayoutPreset("custom");
                      }
                    }}
                    placeholder={`Layer ${layerIdx + 1} label (e.g., Q${layerIdx + 1})`}
                    className="w-32"
                    data-testid={`input-layer-label-${layerIdx}`}
                    disabled={payoutPreset !== "custom"}
                  />
                </div>
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
                <Label>Layer {layerIdx + 1}: {layerLabels[layerIdx] || `Q${layerIdx + 1}`}</Label>
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

      <PrizesEditor
        prizes={prizes}
        onUpdate={(newPrizes, labelsChanged = false) => {
          setPrizes(newPrizes);
          // Only switch to custom if labels/structure changed, not just amounts
          if (labelsChanged && payoutPreset !== "custom") {
            setPayoutPreset("custom");
          }
        }}
        preset={payoutPreset}
        layerCount={redRowsCount}
      />

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
