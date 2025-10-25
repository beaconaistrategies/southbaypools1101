import { useState } from "react";
import TopNav from "@/components/TopNav";
import SquareGrid from "@/components/SquareGrid";
import WinnersPanel from "@/components/WinnersPanel";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ContestManager() {
  const { toast } = useToast();
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [selectedSquareToRelease, setSelectedSquareToRelease] = useState<number | null>(null);
  
  //todo: remove mock functionality
  const [contest, setContest] = useState({
    id: "1",
    name: "Week 8: SF vs DAL",
    topTeam: "San Francisco",
    leftTeam: "Dallas",
    status: "open" as "open" | "locked",
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

  const [winners, setWinners] = useState({
    q1: "23",
    q2: "",
    q3: "67",
    q4: ""
  });

  const [filter, setFilter] = useState<"all" | "available" | "taken">("all");

  const toggleLock = () => {
    setContest(prev => ({
      ...prev,
      status: prev.status === "open" ? "locked" : "open"
    }));
    toast({
      title: contest.status === "open" ? "Contest Locked" : "Contest Unlocked",
      description: contest.status === "open" 
        ? "Entrants can no longer claim squares." 
        : "Entrants can now claim squares.",
    });
  };

  const shuffleAxis = () => {
    const shuffle = (arr: number[]) => {
      const newArr = [...arr];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    };
    
    setContest(prev => ({
      ...prev,
      topAxisNumbers: shuffle(prev.topAxisNumbers),
      leftAxisNumbers: shuffle(prev.leftAxisNumbers),
    }));
    
    toast({
      title: "Axis Numbers Shuffled",
      description: "The top and left axis numbers have been randomized.",
    });
  };

  const handleReleaseSquare = (squareIndex: number) => {
    setSelectedSquareToRelease(squareIndex);
    setShowReleaseDialog(true);
  };

  const confirmReleaseSquare = () => {
    if (selectedSquareToRelease) {
      setSquares(prev => prev.map(s =>
        s.index === selectedSquareToRelease
          ? { ...s, status: "available" as const, entryName: undefined, holderName: undefined, holderEmail: undefined }
          : s
      ));
      
      toast({
        title: "Square Released",
        description: `Square #${selectedSquareToRelease} is now available.`,
      });
    }
    setShowReleaseDialog(false);
    setSelectedSquareToRelease(null);
  };

  const filteredSquares = squares.filter(s => {
    if (filter === "all") return true;
    if (filter === "available") return s.status === "available";
    if (filter === "taken") return s.status === "taken";
    return true;
  });

  const takenCount = squares.filter(s => s.status === "taken").length;
  const availableCount = squares.filter(s => s.status === "available").length;

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="SquareKeeper" />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">{contest.name}</h2>
            <p className="text-muted-foreground mt-1">
              {contest.topTeam} vs {contest.leftTeam}
            </p>
          </div>
          <StatusBadge status={contest.status} />
        </div>

        <Tabs defaultValue="board" className="space-y-6">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="squares">Squares</TabsTrigger>
            <TabsTrigger value="winners">Winners</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={contest.status === "open" ? "outline" : "default"}
                onClick={toggleLock}
                data-testid="button-toggle-lock"
              >
                {contest.status === "open" ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Lock Contest
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock Contest
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={shuffleAxis}
                data-testid="button-shuffle-axis"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Shuffle Axis Numbers
              </Button>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <SquareGrid
                topTeam={contest.topTeam}
                leftTeam={contest.leftTeam}
                topAxisNumbers={contest.topAxisNumbers}
                leftAxisNumbers={contest.leftAxisNumbers}
                redRows={contest.redRows}
                redCols={contest.redCols}
                squares={squares}
                onSquareClick={(square) => console.log("Admin clicked square:", square)}
                readOnly={false}
              />
            </div>
          </TabsContent>

          <TabsContent value="squares" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Squares List</h3>
                <div className="flex gap-2">
                  <Button
                    variant={filter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("all")}
                    data-testid="button-filter-all"
                  >
                    All ({squares.length})
                  </Button>
                  <Button
                    variant={filter === "available" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("available")}
                    data-testid="button-filter-available"
                  >
                    Available ({availableCount})
                  </Button>
                  <Button
                    variant={filter === "taken" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("taken")}
                    data-testid="button-filter-taken"
                  >
                    Taken ({takenCount})
                  </Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredSquares.map((square) => (
                  <div
                    key={square.index}
                    className="flex items-center justify-between p-3 border rounded hover-elevate"
                    data-testid={`square-item-${square.index}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-semibold w-8">#{square.index}</span>
                      <Badge variant={square.status === "taken" ? "secondary" : "outline"}>
                        {square.status}
                      </Badge>
                      {square.status === "taken" && (
                        <div className="text-sm">
                          <span className="font-medium">{square.entryName}</span>
                          <span className="text-muted-foreground ml-2">
                            ({square.holderName})
                          </span>
                        </div>
                      )}
                    </div>
                    {square.status === "taken" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReleaseSquare(square.index)}
                        data-testid={`button-release-${square.index}`}
                      >
                        Release
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="winners" className="space-y-6">
            <WinnersPanel
              q1Winner={winners.q1}
              q2Winner={winners.q2}
              q3Winner={winners.q3}
              q4Winner={winners.q4}
              onUpdate={(quarter, value) => {
                setWinners(prev => ({ ...prev, [quarter]: value }));
                console.log(`${quarter} winner updated:`, value);
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      <ConfirmDialog
        open={showReleaseDialog}
        onOpenChange={setShowReleaseDialog}
        title="Release Square?"
        description={`Square #${selectedSquareToRelease} will become available for others to claim. This action cannot be undone.`}
        confirmLabel="Release"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={confirmReleaseSquare}
      />
    </div>
  );
}
