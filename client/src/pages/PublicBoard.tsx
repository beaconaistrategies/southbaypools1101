import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { User, Shuffle } from "lucide-react";
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
  const [showRandomClaimModal, setShowRandomClaimModal] = useState(false);

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
    // Only allow clicking on available squares
    if (square.status !== "available") {
      return;
    }

    if (contest?.status === "locked") {
      toast({
        title: "Contest Locked",
        description: "This contest is no longer accepting new picks.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedSquare(square.index);
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

  const randomClaimMutation = useMutation({
    mutationFn: async (data: { holderName: string; holderEmail: string; entryName: string }) => {
      const response = await apiRequest("POST", `/api/contests/${contestId}/squares/random`, data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contestId, "squares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contestId] });
      toast({
        title: "Square Assigned",
        description: `Square #${result.squareNumber} has been randomly assigned to ${result.entryName}`,
      });
      setShowRandomClaimModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to assign random square. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRandomClaim = (data: { holderName: string; holderEmail: string; entryName: string }) => {
    randomClaimMutation.mutate(data);
  };

  const handleRandomButtonClick = () => {
    if (contest?.status === "locked") {
      toast({
        title: "Contest Locked",
        description: "This contest is no longer accepting new picks.",
        variant: "destructive",
      });
      return;
    }
    
    if (availableCount === 0) {
      toast({
        title: "No Squares Available",
        description: "All squares have been claimed.",
        variant: "destructive",
      });
      return;
    }
    
    setShowRandomClaimModal(true);
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
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild data-testid="button-my-contests">
                <Link href="/my-contests">
                  <User className="h-4 w-4 mr-2" />
                  My Contests
                </Link>
              </Button>
              <StatusBadge status={contest.status as "open" | "locked"} />
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-6">
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
            
            {contest.status === "open" && availableCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleRandomButtonClick}
                data-testid="button-random-square"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Random Square
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <WinnersPanel
            prizes={contest.prizes || []}
            winners={contest.winners || []}
            readOnly={true}
          />
          
          <div className="bg-card border rounded-lg p-6">
            <SquareGrid
              topTeam={contest.topTeam}
              leftTeam={contest.leftTeam}
              topAxisNumbers={contest.topAxisNumbers}
              leftAxisNumbers={contest.leftAxisNumbers}
              layerLabels={contest.layerLabels || undefined}
              showRedHeaders={contest.showRedHeaders}
              headerColorsEnabled={(contest as any).headerColorsEnabled ?? true}
              layerColors={(contest as any).layerColors}
              squares={squares}
              prizes={contest.prizes || []}
              winners={contest.winners || []}
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

      <ClaimSquareModal
        open={showRandomClaimModal}
        onOpenChange={setShowRandomClaimModal}
        squareNumber={0}
        onConfirm={handleRandomClaim}
        isRandom={true}
      />
    </div>
  );
}
