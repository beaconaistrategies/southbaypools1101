import { useState } from "react";
import SquareGrid from "@/components/SquareGrid";
import ClaimSquareModal from "@/components/ClaimSquareModal";
import WinnersPanel from "@/components/WinnersPanel";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";

export default function PublicBoard() {
  const { toast } = useToast();
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  
  //todo: remove mock functionality
  const [contest] = useState<{
    name: string;
    topTeam: string;
    leftTeam: string;
    status: "open" | "locked";
    topAxisNumbers: number[];
    leftAxisNumbers: number[];
    redRows: number[];
    redCols: number[];
  }>({
    name: "Week 8: SF vs DAL",
    topTeam: "San Francisco",
    leftTeam: "Dallas",
    status: "open",
    topAxisNumbers: [3, 7, 0, 4, 8, 1, 5, 9, 2, 6],
    leftAxisNumbers: [1, 5, 9, 3, 7, 2, 6, 0, 4, 8],
    redRows: [1, 3],
    redCols: [0, 4],
  });

  const [squares, setSquares] = useState(
    Array.from({ length: 100 }, (_, i) => ({
      index: i + 1,
      row: Math.floor(i / 10),
      col: i % 10,
      status: i === 6 || i === 49 || i === 90 ? "taken" as const :
              i === 15 || i === 16 ? "disabled" as const :
              "available" as const,
      entryName: i === 6 ? "AK7" : i === 49 ? "Sam P" : i === 90 ? "JR91" : undefined,
      holderName: i === 6 ? "Alex Kim" : i === 49 ? "Sam Patel" : i === 90 ? "Jordan R" : undefined,
      holderEmail: i === 6 ? "alex@example.com" : i === 49 ? "sam@example.com" : i === 90 ? "jordan@example.com" : undefined,
    }))
  );

  const handleSquareClick = (square: any) => {
    if (contest.status === "locked") {
      toast({
        title: "Contest Locked",
        description: "This contest is no longer accepting new picks.",
        variant: "destructive",
      });
      return;
    }
    
    if (square.status === "available") {
      setSelectedSquare(square.index);
    }
  };

  const handleClaimSquare = (data: { holderName: string; holderEmail: string; entryName: string }) => {
    if (selectedSquare) {
      setSquares(prev => prev.map(s => 
        s.index === selectedSquare
          ? { ...s, status: "taken" as const, ...data }
          : s
      ));
      
      toast({
        title: "Square reserved",
        description: `Square #${selectedSquare} has been reserved for ${data.entryName}`,
      });
      
      setSelectedSquare(null);
    }
  };

  const takenCount = squares.filter(s => s.status === "taken").length;
  const availableCount = squares.filter(s => s.status === "available").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-contest-name">
                {contest.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {contest.topTeam} vs {contest.leftTeam}
              </p>
            </div>
            <StatusBadge status={contest.status} />
          </div>
          
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Taken: </span>
              <span className="font-medium">{takenCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Available: </span>
              <span className="font-medium">{availableCount}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <WinnersPanel
            q1Winner="23"
            q2Winner=""
            q3Winner="67"
            q4Winner=""
            readOnly={true}
          />
          
          <div className="bg-card border rounded-lg p-6">
            <SquareGrid
              topTeam={contest.topTeam}
              leftTeam={contest.leftTeam}
              topAxisNumbers={contest.topAxisNumbers}
              leftAxisNumbers={contest.leftAxisNumbers}
              redRows={contest.redRows}
              redCols={contest.redCols}
              squares={squares}
              onSquareClick={handleSquareClick}
              readOnly={contest.status === "locked"}
            />
          </div>

          <div className="bg-muted/50 border rounded-lg p-4">
            <h3 className="font-medium mb-2">Legend</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-background border rounded" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-muted border rounded" />
                <span>Taken</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-muted/40 border rounded" />
                <span>Disabled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-destructive border rounded" />
                <span>Red Headers</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ClaimSquareModal
        open={selectedSquare !== null}
        onOpenChange={(open) => !open && setSelectedSquare(null)}
        squareNumber={selectedSquare || 0}
        onConfirm={handleClaimSquare}
      />
    </div>
  );
}
