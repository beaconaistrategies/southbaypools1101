import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import SquareGrid from "@/components/SquareGrid";
import ClaimSquareModal from "@/components/ClaimSquareModal";
import WinnersPanel from "@/components/WinnersPanel";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Contest, Square } from "@shared/schema";

export default function PublicBoard() {
  const { toast } = useToast();
  const params = useParams();
  const contestId = params.id || "1";
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);

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

  // Claim square mutation
  const claimSquareMutation = useMutation({
    mutationFn: async ({ index, data }: { index: number; data: any }) => {
      return await apiRequest("PATCH", `/api/contests/${contestId}/squares/${index}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contestId, "squares"] });
    },
  });

  const handleSquareClick = (square: any) => {
    if (contest?.status === "locked") {
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
      claimSquareMutation.mutate(
        {
          index: selectedSquare,
          data: {
            status: "taken",
            ...data,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Square reserved",
              description: `Square #${selectedSquare} has been reserved for ${data.entryName}`,
            });
            setSelectedSquare(null);
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Failed to claim square. Please try again.",
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  if (contestLoading || squaresLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <p className="text-muted-foreground">Loading contest...</p>
          </div>
        </header>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <p className="text-destructive">Contest not found</p>
          </div>
        </header>
      </div>
    );
  }

  const takenCount = squares.filter(s => s.status === "taken").length;
  const availableCount = squares.filter(s => s.status === "available").length;
  const redRows = Array.from({ length: contest.redRowsCount }, (_, i) => i);
  const redCols: number[] = [];

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
            <StatusBadge status={contest.status as "open" | "locked"} />
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
            q1Winner={contest.q1Winner || ""}
            q2Winner={contest.q2Winner || ""}
            q3Winner={contest.q3Winner || ""}
            q4Winner={contest.q4Winner || ""}
            readOnly={true}
          />
          
          <div className="bg-card border rounded-lg p-6">
            <SquareGrid
              topTeam={contest.topTeam}
              leftTeam={contest.leftTeam}
              topAxisNumbers={contest.topAxisNumbers}
              leftAxisNumbers={contest.leftAxisNumbers}
              redRows={redRows}
              redCols={redCols}
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
