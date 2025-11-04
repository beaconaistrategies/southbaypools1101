import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import ContestForm from "@/components/ContestForm";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Contest, Square } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Eye, EyeOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function EditContest() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const contestId = params.id || "";
  const [isExporting, setIsExporting] = useState(false);

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

  const deleteContestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/contests/${contestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({
        title: "Deleted",
        description: "Contest has been deleted successfully.",
      });
      setLocation("/admin");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contest",
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

  const handleDelete = () => {
    deleteContestMutation.mutate();
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/contests/${contestId}/export-csv`);
      if (!response.ok) throw new Error("Failed to export contest");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contest-${contestId}-export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Exported",
        description: "Contest data has been exported to CSV.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export contest",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleRedHeadersMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/contests/${contestId}`, {
        showRedHeaders: !contest?.showRedHeaders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contestId] });
      toast({
        title: contest?.showRedHeaders ? "Numbers Hidden" : "Numbers Revealed",
        description: contest?.showRedHeaders
          ? "Red header numbers are now hidden from the board."
          : "Red header numbers are now visible on the board.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle red headers",
        variant: "destructive",
      });
    },
  });

  const handleToggleRedHeaders = () => {
    toggleRedHeadersMutation.mutate();
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

  // Extract reserved squares (those that were pre-assigned with status="taken")
  const reservedSquares = squares
    .filter(s => s.status === "taken" && s.entryName && s.holderName && s.holderEmail)
    .map(s => ({
      squareNumber: s.index,
      entryName: s.entryName || "",
      holderName: s.holderName || "",
      holderEmail: s.holderEmail || "",
    }));

  // Convert eventDate to YYYY-MM-DD format for the input
  const eventDateString = new Date(contest.eventDate).toISOString().split('T')[0];

  const initialData = {
    name: contest.name,
    slug: (contest as any).slug || "",
    eventDate: eventDateString,
    topTeam: contest.topTeam,
    leftTeam: contest.leftTeam,
    notes: contest.notes || "",
    webhookUrl: contest.webhookUrl || "",
    folderId: contest.folderId || null,
    topAxisNumbers: contest.topAxisNumbers,
    leftAxisNumbers: contest.leftAxisNumbers,
    layerLabels: contest.layerLabels || [],
    redRowsCount: contest.topAxisNumbers.length,
    status: contest.status,
    availableSquares,
    prizes: contest.prizes || [],
    reservedSquares,
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="SquareKeeper" />
      
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-semibold">Edit Contest</h2>
            <p className="text-muted-foreground mt-2">
              Update your football squares pool
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={isExporting}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>

            <Button
              variant={contest.showRedHeaders ? "default" : "outline"}
              size="sm"
              onClick={handleToggleRedHeaders}
              data-testid="button-toggle-red-headers"
            >
              {contest.showRedHeaders ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Hide Numbers
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Reveal Numbers
                </>
              )}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  data-testid="button-delete-contest"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Contest?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this contest and all associated squares. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    data-testid="button-confirm-delete"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Contest
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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
