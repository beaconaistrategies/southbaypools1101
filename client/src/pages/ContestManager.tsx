import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import SquareGrid from "@/components/SquareGrid";
import { ArrowLeft, Download, Trash2, Copy, Link as LinkIcon, ExternalLink, Zap } from "lucide-react";
import WinnersPanel from "@/components/WinnersPanel";
import PrizesEditor from "@/components/PrizesEditor";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import CloneContestDialog from "@/components/CloneContestDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Shuffle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportContestToCSV } from "@/lib/csvExport";
import type { Contest, Square, Prize, Winner } from "@shared/schema";

export default function ContestManager() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const contestId = params.id || "1";
  
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [selectedSquareToRelease, setSelectedSquareToRelease] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
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
      return await apiRequest("PATCH", `/api/contests/${contestId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contestId] });
    },
  });

  // Update square mutation
  const updateSquareMutation = useMutation({
    mutationFn: async ({ index, data }: { index: number; data: Partial<Square> }) => {
      return await apiRequest("PATCH", `/api/contests/${contestId}/squares/${index}`, data);
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

    // Shuffle each layer independently for both axes
    const shuffledTopLayers = contest.topAxisNumbers.map(layer => shuffle([...layer]));
    const shuffledLeftLayers = contest.leftAxisNumbers.map(layer => shuffle([...layer]));

    updateContestMutation.mutate(
      {
        topAxisNumbers: shuffledTopLayers,
        leftAxisNumbers: shuffledLeftLayers,
      },
      {
        onSuccess: () => {
          toast({
            title: "Axis Numbers Shuffled",
            description: "All axis number layers have been randomized.",
          });
        },
      }
    );
  };

  const toggleRedHeaders = () => {
    updateContestMutation.mutate(
      { showRedHeaders: !contest?.showRedHeaders },
      {
        onSuccess: () => {
          toast({
            title: contest?.showRedHeaders ? "Red Headers Hidden" : "Red Headers Revealed",
            description: contest?.showRedHeaders
              ? "The axis numbers are now hidden from the grid."
              : "The axis numbers are now visible on the grid.",
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

  const handleUpdateWinners = (winners: Winner[]) => {
    updateContestMutation.mutate(
      { winners },
      {
        onSuccess: () => {
          toast({
            title: "Winners Updated",
            description: "Winning squares have been saved.",
          });
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (contest) {
      exportContestToCSV(contest, squares);
      toast({
        title: "CSV Exported",
        description: "Contest data has been downloaded.",
      });
    }
  };

  const deleteContestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/contests/${contestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({
        title: "Contest Deleted",
        description: "The contest has been permanently deleted.",
      });
      setLocation("/admin");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteContest = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteContest = () => {
    deleteContestMutation.mutate();
    setShowDeleteDialog(false);
  };

  const cloneContestMutation = useMutation({
    mutationFn: async (data: { name: string; eventDate: string }) => {
      const response = await apiRequest("POST", `/api/contests/${contestId}/clone`, data);
      return response.json();
    },
    onSuccess: (clonedContest: Contest) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({
        title: "Contest Cloned",
        description: "The contest has been successfully cloned.",
      });
      setLocation(`/admin/contests/${clonedContest.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clone contest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCloneContest = (name: string, eventDate: string) => {
    cloneContestMutation.mutate({ name, eventDate });
  };

  const handleCopyPublicLink = async () => {
    const publicUrl = `${window.location.origin}/board/${contestId}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link Copied",
        description: "Public board link copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/contests/${contestId}/test-webhook`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Webhook Test Successful",
        description: "Test notification sent successfully to your webhook URL.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Webhook Test Failed",
        description: error?.message || "Failed to send test webhook. Check your URL and try again.",
        variant: "destructive",
      });
    },
  });

  const handleTestWebhook = () => {
    testWebhookMutation.mutate();
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
            <div className="flex-1">
              <h2 className="text-3xl font-semibold">{contest.name}</h2>
              <p className="text-muted-foreground mt-1">
                {contest.topTeam} vs {contest.leftTeam}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloneDialog(true)}
                data-testid="button-clone-contest"
              >
                <Copy className="h-4 w-4 mr-2" />
                Clone
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteContest}
                data-testid="button-delete-contest"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <StatusBadge status={contest.status as "open" | "locked"} />
            </div>
          </div>
        </div>

        <Tabs defaultValue="board" className="space-y-6">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="squares">Squares</TabsTrigger>
            <TabsTrigger value="winners">Winners</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="space-y-6">
            <div className="flex flex-wrap gap-2 items-center">
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
              
              <Button
                variant={contest.showRedHeaders ? "default" : "outline"}
                onClick={toggleRedHeaders}
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

              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyPublicLink}
                  data-testid="button-copy-link"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Copy Public Link
                </Button>
                <Button
                  variant="outline"
                  asChild
                  data-testid="button-view-public"
                >
                  <a href={`/board/${contestId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Public Board
                  </a>
                </Button>
              </div>
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
                topLayerLabels={contest.topLayerLabels || undefined}
                leftLayerLabels={contest.leftLayerLabels || undefined}
                showRedHeaders={contest.showRedHeaders}
                squares={squares}
                prizes={contest.prizes || []}
                winners={contest.winners || []}
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

          <TabsContent value="winners" className="space-y-6">
            <PrizesEditor
              prizes={contest.prizes || []}
              onUpdate={(prizes: Prize[]) => {
                updateContestMutation.mutate(
                  { prizes },
                  {
                    onSuccess: () => {
                      toast({
                        title: "Prizes Updated",
                        description: "Prize payouts have been saved.",
                      });
                    },
                  }
                );
              }}
            />
            
            <WinnersPanel
              prizes={contest.prizes || []}
              winners={contest.winners || []}
              onUpdate={handleUpdateWinners}
              readOnly={false}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Webhook Integration</h3>
              
              {contest.webhookUrl ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Webhook URL</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                      {contest.webhookUrl}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTestWebhook}
                      disabled={testWebhookMutation.isPending}
                      data-testid="button-test-webhook"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {testWebhookMutation.isPending ? "Sending..." : "Test Webhook"}
                    </Button>
                  </div>

                  <div className="mt-4 p-4 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Test Payload Preview:</strong>
                    </p>
                    <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{JSON.stringify({
  event: "test_webhook",
  timestamp: new Date().toISOString(),
  data: {
    contestName: contest.name,
    contestId: contest.id,
    entryName: "Test Entry",
    holderEmail: "test@example.com",
    holderName: "Test User",
    squareNumber: 1,
    topTeam: contest.topTeam,
    leftTeam: contest.leftTeam,
    eventDate: contest.eventDate.toISOString()
  }
}, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No webhook URL configured for this contest.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    To add webhook notifications, edit the contest and provide a webhook URL.
                  </p>
                </div>
              )}
            </Card>
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

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Contest"
        description={`Are you sure you want to permanently delete "${contest.name}"? This action cannot be undone and will delete all associated squares and data.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteContest}
      />

      <CloneContestDialog
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
        originalName={contest.name}
        onConfirm={handleCloneContest}
      />
    </div>
  );
}
