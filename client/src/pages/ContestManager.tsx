import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import SquareGrid from "@/components/SquareGrid";
import { ArrowLeft } from "lucide-react";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Contest, Square } from "@shared/schema";

export default function ContestManager() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const contestId = params.id || "1";
  
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [selectedSquareToRelease, setSelectedSquareToRelease] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "available" | "taken">("all");

  // Fetch contest data
  const { data: contest, isLoading: contestLoading } = useQuery<Contest>({
    queryKey: ["/api/contests", contestId],
    queryFn: async () => {
      const response = await fetch(`/api/contests/${contestId}`);
      if (!response.ok) throw new Error("Failed to fetch contest");
      return response.json();
    },
  });

  // Fetch squares data
  const { data: squares = [], isLoading: squaresLoading } = useQuery<Square[]>({
    queryKey: ["/api/contests", contestId, "squares"],
    queryFn: async () => {
      const response = await fetch(`/api/contests/${contestId}/squares`);
      if (!response.ok) throw new Error("Failed to fetch squares");
      return response.json();
    },
  });

  // Update contest mutation
  const updateContestMutation = useMutation({
    mutationFn: async (data: Partial<Contest>) => {
      return await apiRequest(`/api/contests/${contestId}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contestId] });
    },
  });

  // Update square mutation
  const updateSquareMutation = useMutation({
    mutationFn: async ({ index, data }: { index: number; data: Partial<Square> }) => {
      return await apiRequest(`/api/contests/${contestId}/squares/${index}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contestId, "squares"] });
    },
  });

  const toggleLock = () => {
    const newStatus = contest?.status === "open" ? "locked" : "open";
    updateContestMutation.mutate(
      { status: newStatus },
      {
        onSuccess: () => {
          toast({
            title: newStatus === "locked" ? "Contest Locked" : "Contest Unlocked",
            description: newStatus === "locked"
              ? "Entrants can no longer claim squares."
              : "Entrants can now claim squares.",
          });
        },
      }
    );
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

    if (!contest) return;

    updateContestMutation.mutate(
      {
        topAxisNumbers: shuffle([...contest.topAxisNumbers]),
        leftAxisNumbers: shuffle([...contest.leftAxisNumbers]),
      },
      {
        onSuccess: () => {
          toast({
            title: "Axis Numbers Shuffled",
            description: "The top and left axis numbers have been randomized.",
          });
        },
      }
    );
  };

  const handleReleaseSquare = (squareIndex: number) => {
    setSelectedSquareToRelease(squareIndex);
    setShowReleaseDialog(true);
  };

  const confirmReleaseSquare = () => {
    if (selectedSquareToRelease) {
      updateSquareMutation.mutate(
        {
          index: selectedSquareToRelease,
          data: {
            status: "available",
            entryName: null,
            holderName: null,
            holderEmail: null,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Square Released",
              description: `Square #${selectedSquareToRelease} is now available.`,
            });
          },
        }
      );
    }
    setShowReleaseDialog(false);
    setSelectedSquareToRelease(null);
  };

  const handleUpdateWinner = (quarter: "q1" | "q2" | "q3" | "q4", value: string) => {
    const winnerField = `${quarter}Winner`;
    updateContestMutation.mutate({ [winnerField]: value });
  };

  if (contestLoading || squaresLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav title="SquareKeeper" />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-muted-foreground">Loading contest...</p>
        </main>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav title="SquareKeeper" />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-destructive">Contest not found</p>
        </main>
      </div>
    );
  }

  const filteredSquares = squares.filter(s => {
    if (filter === "all") return true;
    if (filter === "available") return s.status === "available";
    if (filter === "taken") return s.status === "taken";
    return true;
  });

  const takenCount = squares.filter(s => s.status === "taken").length;
  const availableCount = squares.filter(s => s.status === "available").length;
  
  const redRows = Array.from({ length: contest.redRowsCount }, (_, i) => i);
  const redCols: number[] = [];

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="SquareKeeper" />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/admin")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">{contest.name}</h2>
              <p className="text-muted-foreground mt-1">
                {contest.topTeam} vs {contest.leftTeam}
              </p>
            </div>
            <StatusBadge status={contest.status as "open" | "locked"} />
          </div>
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
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-4 text-sm">
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
              
              <SquareGrid
                topTeam={contest.topTeam}
                leftTeam={contest.leftTeam}
                topAxisNumbers={contest.topAxisNumbers}
                leftAxisNumbers={contest.leftAxisNumbers}
                redRows={redRows}
                redCols={redCols}
                squares={squares}
                readOnly={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="squares" className="space-y-6">
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                data-testid="filter-all"
              >
                All ({squares.length})
              </Button>
              <Button
                variant={filter === "available" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("available")}
                data-testid="filter-available"
              >
                Available ({availableCount})
              </Button>
              <Button
                variant={filter === "taken" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("taken")}
                data-testid="filter-taken"
              >
                Taken ({takenCount})
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSquares.map((square) => (
                <Card key={square.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold">
                        #{square.index}
                      </span>
                      <Badge variant={
                        square.status === "available" ? "outline" :
                        square.status === "taken" ? "default" : "secondary"
                      }>
                        {square.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {square.status === "taken" && (
                    <div className="space-y-1 text-sm mb-3">
                      <p className="font-medium">{square.entryName}</p>
                      <p className="text-muted-foreground">{square.holderName}</p>
                      <p className="text-xs text-muted-foreground">{square.holderEmail}</p>
                    </div>
                  )}
                  
                  {square.status === "taken" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReleaseSquare(square.index)}
                      className="w-full"
                      data-testid={`button-release-${square.index}`}
                    >
                      Release Square
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="winners">
            <WinnersPanel
              q1Winner={contest.q1Winner || ""}
              q2Winner={contest.q2Winner || ""}
              q3Winner={contest.q3Winner || ""}
              q4Winner={contest.q4Winner || ""}
              onUpdate={handleUpdateWinner}
              readOnly={false}
            />
          </TabsContent>
        </Tabs>
      </main>

      <ConfirmDialog
        open={showReleaseDialog}
        onOpenChange={setShowReleaseDialog}
        title="Release Square"
        description={`Are you sure you want to release square #${selectedSquareToRelease}? This will make it available for others to claim.`}
        confirmLabel="Release"
        onConfirm={confirmReleaseSquare}
      />
    </div>
  );
}
