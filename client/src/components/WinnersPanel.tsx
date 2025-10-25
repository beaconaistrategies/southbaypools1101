import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WinnersPanelProps {
  q1Winner?: string;
  q2Winner?: string;
  q3Winner?: string;
  q4Winner?: string;
  onUpdate?: (quarter: 'q1' | 'q2' | 'q3' | 'q4', value: string) => void;
  readOnly?: boolean;
}

export default function WinnersPanel({
  q1Winner = "",
  q2Winner = "",
  q3Winner = "",
  q4Winner = "",
  onUpdate,
  readOnly = false
}: WinnersPanelProps) {
  const quarters = [
    { id: 'q1' as const, label: 'Q1', value: q1Winner },
    { id: 'q2' as const, label: 'Q2', value: q2Winner },
    { id: 'q3' as const, label: 'Q3', value: q3Winner },
    { id: 'q4' as const, label: 'Q4', value: q4Winner },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Winners</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quarters.map((quarter) => (
          <div key={quarter.id} className="space-y-2">
            <Label htmlFor={quarter.id} className="text-sm font-medium">
              {quarter.label}
            </Label>
            {readOnly ? (
              <div 
                className="text-2xl font-bold font-mono text-center py-2"
                data-testid={`text-winner-${quarter.id}`}
              >
                {quarter.value || "—"}
              </div>
            ) : (
              <Input
                id={quarter.id}
                value={quarter.value}
                onChange={(e) => onUpdate?.(quarter.id, e.target.value)}
                placeholder="—"
                className="text-center font-mono"
                data-testid={`input-winner-${quarter.id}`}
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
