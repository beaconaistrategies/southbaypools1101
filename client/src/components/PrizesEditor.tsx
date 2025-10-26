import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { Prize } from "@shared/schema";

interface PrizesEditorProps {
  prizes: Prize[];
  onUpdate: (prizes: Prize[]) => void;
  readOnly?: boolean;
}

export default function PrizesEditor({ prizes, onUpdate, readOnly = false }: PrizesEditorProps) {
  const [localPrizes, setLocalPrizes] = useState<Prize[]>(prizes.length > 0 ? prizes : [
    { label: "Q1", amount: "" },
    { label: "Q2", amount: "" },
    { label: "Q3", amount: "" },
    { label: "Q4", amount: "" },
  ]);

  const handleLabelChange = (index: number, value: string) => {
    const updated = [...localPrizes];
    updated[index].label = value;
    setLocalPrizes(updated);
    onUpdate(updated);
  };

  const handleAmountChange = (index: number, value: string) => {
    const updated = [...localPrizes];
    updated[index].amount = value;
    setLocalPrizes(updated);
    onUpdate(updated);
  };

  const handleAddRow = () => {
    const updated = [...localPrizes, { label: "", amount: "" }];
    setLocalPrizes(updated);
    onUpdate(updated);
  };

  const handleRemoveRow = (index: number) => {
    const updated = localPrizes.filter((_, i) => i !== index);
    setLocalPrizes(updated);
    onUpdate(updated);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Prize Payouts</h3>
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
        <p className="font-medium mb-1">Common prize types:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>Q1, Q2, Q3, Q4</strong> - Quarter winners</li>
          <li><strong>Half, Final</strong> - Half and final score winners</li>
          <li><strong>Q1+2, Q2+2</strong> - Add 2 to the winning numbers</li>
          <li><strong>Opposite</strong> - Opposite of the winning numbers</li>
          <li><strong>Reverse</strong> - Reverse the winning numbers</li>
        </ul>
      </div>
    </Card>
  );
}
