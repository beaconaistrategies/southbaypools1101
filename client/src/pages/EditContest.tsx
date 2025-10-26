import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import ContestForm from "@/components/ContestForm";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Contest, Square } from "@shared/schema";

export default function EditContest() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const contestId = params.id || "";

  // Fetch contest data
  const { data: contest, isLoading: contestLoading } = useQuery<Contest>({
    queryKey: ["/api/contests", contestId],
    queryFn: async () => {
      const response = await fetch(`/api/contests/${contestId}`);
      if (!response.ok) throw new Error("Failed to fetch contest");
      return response.json();
    },
  });

  // Fetch squares data to determine available squares
  const { data: squares = [], isLoading: squaresLoading } = useQuery<Square[]>({
    queryKey: ["/api/contests", contestId, "squares"],
    queryFn: async () => {
      const response = await fetch(`/api/contests/${contestId}/squares`);
      if (!response.ok) throw new Error("Failed to fetch squares");
      return response.json();
    },
  });

  const updateContestMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/contests/${contestId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contestId] });
      toast({
        title: "Saved",
        description: "Contest has been updated successfully.",
      });
      setTimeout(() => setLocation("/admin"), 500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contest",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    updateContestMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation("/admin");
  };

  if (contestLoading || squaresLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav title="SquareKeeper" />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-muted-foreground">Loading contest...</p>
        </main>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav title="SquareKeeper" />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-destructive">Contest not found</p>
        </main>
      </div>
    );
  }

  // Convert contest data to form format
  const availableSquares = squares
    .filter(s => s.status === "available")
    .map(s => s.index);

  // Convert eventDate to YYYY-MM-DD format for the input
  const eventDateString = new Date(contest.eventDate).toISOString().split('T')[0];

  const initialData = {
    name: contest.name,
    eventDate: eventDateString,
    topTeam: contest.topTeam,
    leftTeam: contest.leftTeam,
    notes: contest.notes || "",
    topAxisNumbers: contest.topAxisNumbers,
    leftAxisNumbers: contest.leftAxisNumbers,
    topLayerLabels: contest.topLayerLabels || [],
    leftLayerLabels: contest.leftLayerLabels || [],
    redRowsCount: contest.topAxisNumbers.length,
    status: contest.status,
    availableSquares,
    prizes: contest.prizes || [],
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="SquareKeeper" />
      
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold">Edit Contest</h2>
          <p className="text-muted-foreground mt-2">
            Update your football squares pool
          </p>
        </div>

        <ContestForm 
          initialData={initialData} 
          onSubmit={handleSubmit} 
          onCancel={handleCancel} 
        />
      </main>
    </div>
  );
}
