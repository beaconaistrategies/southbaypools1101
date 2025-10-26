import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import type { Prize } from "@shared/schema";

interface PrizesEditorProps {
  prizes: Prize[];
  onUpdate: (prizes: Prize[], labelsChanged?: boolean) => void;
  readOnly?: boolean;
  preset?: "quarters" | "halves" | "custom";
  layerCount?: number;
}

export default function PrizesEditor({ prizes, onUpdate, readOnly = false, preset = "custom", layerCount = 4 }: PrizesEditorProps) {
  const [localPrizes, setLocalPrizes] = useState<Prize[]>(prizes.length > 0 ? prizes : [
    { label: "Q1", amount: "" },
    { label: "Q2", amount: "" },
    { label: "Q3", amount: "" },
    { label: "Q4", amount: "" },
  ]);

  // Sync local prizes when external prizes change (e.g., from preset)
  useEffect(() => {
    if (prizes.length > 0) {
      setLocalPrizes(prizes);
    }
  }, [prizes]);

  // Check if prize count matches layer count
  const countMismatch = localPrizes.length !== layerCount;

  const handleLabelChange = (index: number, value: string) => {
    const updated = [...localPrizes];
    updated[index].label = value;
    setLocalPrizes(updated);
    onUpdate(updated, true); // labelsChanged = true
  };

  const handleAmountChange = (index: number, value: string) => {
    const updated = [...localPrizes];
    updated[index].amount = value;
    setLocalPrizes(updated);
    onUpdate(updated, false); // labelsChanged = false
  };

  const handleAddRow = () => {
    const updated = [...localPrizes, { label: "", amount: "" }];
    setLocalPrizes(updated);
    onUpdate(updated, true); // labelsChanged = true (count changed)
  };

  const handleRemoveRow = (index: number) => {
    const updated = localPrizes.filter((_, i) => i !== index);
    setLocalPrizes(updated);
    onUpdate(updated, true); // labelsChanged = true (count changed)
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Prize Payouts</h3>
          {preset !== "custom" && (
            <p className="text-sm text-muted-foreground mt-1">
              Synced with {preset === "quarters" ? "Quarters" : "Half and Final"} preset
            </p>
          )}
        </div>
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddRow}
            data-testid="button-add-prize"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Prize
          </Button>
        )}
      </div>

      {countMismatch && preset === "custom" && !readOnly && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Warning: You have {localPrizes.length} prize{localPrizes.length !== 1 ? "s" : ""} but {layerCount} layer{layerCount !== 1 ? "s" : ""}. 
            For best results, the number of prizes should match the number of layers.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {/* Header Row */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 pb-2 border-b">
          <div className="text-sm font-medium text-muted-foreground">Prize Label</div>
          <div className="text-sm font-medium text-muted-foreground">Amount</div>
          <div className="w-9"></div>
        </div>

        {/* Prize Rows */}
        {localPrizes.map((prize, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
            <Input
              value={prize.label}
              onChange={(e) => handleLabelChange(index, e.target.value)}
              placeholder="Q1, Q1+2, Opposite, etc."
              disabled={readOnly}
              data-testid={`input-prize-label-${index}`}
            />
            <Input
              value={prize.amount}
              onChange={(e) => handleAmountChange(index, e.target.value)}
              placeholder="$100"
              disabled={readOnly}
              data-testid={`input-prize-amount-${index}`}
            />
            {!readOnly && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveRow(index)}
                disabled={localPrizes.length === 1}
                data-testid={`button-remove-prize-${index}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}

        {localPrizes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No prizes configured. Click "Add Prize" to get started.
          </p>
        )}
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">Tips:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Prize labels should match your layer labels (Q1→Q1, Half→Half, etc.)</li>
          <li>Use the <strong>preset selector</strong> above to automatically sync everything</li>
          <li>Each prize's color on the grid matches its position in this list</li>
          <li>Custom labels like "Q1+2", "Opposite", or "Reverse" are supported for advanced scoring</li>
        </ul>
      </div>
    </Card>
  );
}
