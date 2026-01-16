import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import TopNav from "@/components/TopNav";
import type { GolfPool, GolfPoolEntry, GolfTournament } from "@shared/schema";
import { ArrowLeft, Plus, Users, Calendar, Trophy, CircleDot, Settings, Trash2, Play, Pause, Check, X, Copy, ExternalLink, UserCog, Search } from "lucide-react";
import { format } from "date-fns";

type PoolWithDetails = GolfPool & {
  entries: GolfPoolEntry[];
  tournaments: GolfTournament[];
};

type GolferWithRanking = {
  name: string;
  datagolfId: number;
  country: string;
  ranking?: number;
};

type TournamentField = {
  eventName: string;
  eventId: string;
  tour: string;
  lastUpdated: string;
  golfers: GolferWithRanking[];
};

export default function GolfPoolManager() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const poolId = params.id || "";
  const { toast } = useToast();
  const [showAddEntryDialog, setShowAddEntryDialog] = useState(false);
  const [newEntryName, setNewEntryName] = useState("");
  const [newEntryEmail, setNewEntryEmail] = useState("");
  const [showMakePickDialog, setShowMakePickDialog] = useState(false);
  const [selectedEntryForPick, setSelectedEntryForPick] = useState<GolfPoolEntry | null>(null);
  const [pickSearchQuery, setPickSearchQuery] = useState("");
  const [selectedGolfer, setSelectedGolfer] = useState<GolferWithRanking | null>(null);

  const { data: pool, isLoading } = useQuery<PoolWithDetails>({
    queryKey: ["/api/golf/pools", poolId],
    queryFn: async () => {
      const response = await fetch(`/api/golf/pools/${poolId}`);
      if (!response.ok) throw new Error("Failed to fetch pool");
      return response.json();
    },
  });

  const { data: tournaments = [] } = useQuery<GolfTournament[]>({
    queryKey: ["/api/golf/tournaments", pool?.season],
    queryFn: async () => {
      const response = await fetch(`/api/golf/tournaments?season=${pool?.season}`);
      if (!response.ok) throw new Error("Failed to fetch tournaments");
      return response.json();
    },
    enabled: !!pool?.season,
  });

  const updatePoolMutation = useMutation({
    mutationFn: async (data: Partial<GolfPool>) => {
      return await apiRequest("PATCH", `/api/golf/pools/${poolId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/golf/pools", poolId] });
      toast({ title: "Pool Updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: async (data: { entryName: string; email: string }) => {
      return await apiRequest("POST", `/api/golf/pools/${poolId}/entries`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/golf/pools", poolId] });
      toast({ title: "Entry Added" });
      setShowAddEntryDialog(false);
      setNewEntryName("");
      setNewEntryEmail("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ entryId, data }: { entryId: string; data: { status: string } }) => {
      return await apiRequest("PATCH", `/api/golf/entries/${entryId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/golf/pools", poolId] });
      toast({ title: "Entry Updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePoolMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/golf/pools/${poolId}`);
    },
    onSuccess: () => {
      toast({ title: "Pool Deleted" });
      setLocation("/admin/golf");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      return await apiRequest("DELETE", `/api/golf/entries/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/golf/pools", poolId] });
      toast({ title: "Entry Deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const adminPickMutation = useMutation({
    mutationFn: async ({ entryId, golferName, weekNumber, tournamentName }: { entryId: string; golferName: string; weekNumber: number; tournamentName?: string }) => {
      return await apiRequest("POST", `/api/golf/entries/${entryId}/admin-pick`, { golferName, weekNumber, tournamentName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/golf/pools", poolId] });
      toast({ title: "Pick Submitted", description: "Pick was made on behalf of the user" });
      setShowMakePickDialog(false);
      setSelectedEntryForPick(null);
      setSelectedGolfer(null);
      setPickSearchQuery("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: fieldData } = useQuery<TournamentField>({
    queryKey: ["/api/datagolf/field"],
    queryFn: async () => {
      const response = await fetch("/api/datagolf/field?tour=pga");
      if (!response.ok) throw new Error("Failed to fetch field");
      return response.json();
    },
    enabled: showMakePickDialog,
  });

  const currentTournament = tournaments.find((t) => t.weekNumber === pool?.currentWeek);

  const filteredGolfers = fieldData?.golfers?.filter((g) => {
    if (!pickSearchQuery) return true;
    return g.name.toLowerCase().includes(pickSearchQuery.toLowerCase());
  }) || [];

  const usedGolfersForSelectedEntry = (selectedEntryForPick?.usedGolfers as string[]) || [];

  const handleStatusChange = (newStatus: string) => {
    updatePoolMutation.mutate({ status: newStatus as any });
  };

  const handleWeekChange = (week: string) => {
    updatePoolMutation.mutate({ currentWeek: parseInt(week) });
  };

  const handleAddEntry = () => {
    if (newEntryName && newEntryEmail) {
      addEntryMutation.mutate({ entryName: newEntryName, email: newEntryEmail });
    }
  };

  const handleEliminateEntry = (entryId: string) => {
    updateEntryMutation.mutate({ entryId, data: { status: "eliminated" } });
  };

  const handleReinstateEntry = (entryId: string) => {
    updateEntryMutation.mutate({ entryId, data: { status: "active" } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav title="Golf Survivor" />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav title="Golf Survivor" />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-destructive">Pool not found</p>
        </main>
      </div>
    );
  }

  const activeEntries = pool.entries?.filter((e) => e.status === "active") || [];
  const eliminatedEntries = pool.entries?.filter((e) => e.status === "eliminated") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="secondary">Upcoming</Badge>;
      case "active":
        return <Badge className="bg-green-600 text-white">Active</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="Golf Survivor" />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/golf")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-semibold">{pool.name}</h2>
                {getStatusBadge(pool.status)}
              </div>
              <p className="text-muted-foreground">
                {pool.season} Season - Week {pool.currentWeek}
                {currentTournament && ` - ${currentTournament.name}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const signupUrl = `${window.location.origin}/golf/pool/${poolId}/signup`;
                  try {
                    await navigator.clipboard.writeText(signupUrl);
                    toast({ title: "Link Copied", description: "Signup link copied to clipboard." });
                  } catch (err) {
                    toast({ title: "Error", description: "Failed to copy link.", variant: "destructive" });
                  }
                }}
                data-testid="button-copy-signup-link"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Signup Link
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(`/golf/pool/${poolId}/signup`, "_blank")}
                aria-label="Open signup page in new tab"
                data-testid="button-view-signup-page"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-delete-pool">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Pool
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Pool?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this pool and all its entries. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deletePoolMutation.mutate()}
                    className="bg-destructive text-destructive-foreground"
                    data-testid="button-confirm-delete"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={pool.status} onValueChange={handleStatusChange}>
                <SelectTrigger data-testid="select-pool-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Week</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={pool.currentWeek?.toString()} onValueChange={handleWeekChange}>
                <SelectTrigger data-testid="select-current-week">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((week) => {
                    const tournament = tournaments.find((t) => t.weekNumber === week);
                    return (
                      <SelectItem key={week} value={week.toString()}>
                        Week {week}{tournament ? ` - ${tournament.name}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">{activeEntries.length}</div>
                <span className="text-sm text-muted-foreground">active</span>
                {eliminatedEntries.length > 0 && (
                  <>
                    <div className="text-2xl font-bold text-muted-foreground">{eliminatedEntries.length}</div>
                    <span className="text-sm text-muted-foreground">eliminated</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Pool Entries</CardTitle>
              <CardDescription>
                Manage participants in this survivor pool
              </CardDescription>
            </div>
            <Dialog open={showAddEntryDialog} onOpenChange={setShowAddEntryDialog}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-entry">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Entry</DialogTitle>
                  <DialogDescription>
                    Add a new participant to this pool
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Entry Name</label>
                    <Input
                      value={newEntryName}
                      onChange={(e) => setNewEntryName(e.target.value)}
                      placeholder="e.g., John's Entry"
                      data-testid="input-entry-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={newEntryEmail}
                      onChange={(e) => setNewEntryEmail(e.target.value)}
                      placeholder="email@example.com"
                      data-testid="input-entry-email"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddEntryDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddEntry}
                    disabled={!newEntryName || !newEntryEmail || addEntryMutation.isPending}
                    data-testid="button-submit-entry"
                  >
                    {addEntryMutation.isPending ? "Adding..." : "Add Entry"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {pool.entries?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No entries yet. Add your first participant above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used Golfers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pool.entries?.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <TableCell className="font-medium">{entry.entryName}</TableCell>
                      <TableCell>{entry.email}</TableCell>
                      <TableCell>
                        {entry.status === "active" ? (
                          <Badge className="bg-green-600 text-white">Active</Badge>
                        ) : (
                          <Badge variant="destructive">
                            Eliminated (Week {entry.eliminatedWeek})
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {(entry.usedGolfers as string[] || []).length} golfers
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {entry.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEntryForPick(entry);
                                setShowMakePickDialog(true);
                              }}
                              data-testid={`button-make-pick-${entry.id}`}
                            >
                              <UserCog className="h-4 w-4 mr-1" />
                              Make Pick
                            </Button>
                          )}
                          {entry.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminateEntry(entry.id)}
                              data-testid={`button-eliminate-${entry.id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Eliminate
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReinstateEntry(entry.id)}
                              data-testid={`button-reinstate-${entry.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Reinstate
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-${entry.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{entry.entryName}"? This will permanently remove the entry and all their picks. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteEntryMutation.mutate(entry.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Pool Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pool.entryFee && (
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Entry Fee:</span>
                <span>{pool.entryFee}</span>
              </div>
            )}
            {pool.prizePool && (
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Prize Pool:</span>
                <span>{pool.prizePool}</span>
              </div>
            )}
            {pool.notes && (
              <div>
                <span className="font-medium">Notes:</span>
                <p className="text-muted-foreground mt-1">{pool.notes}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="show-picks-toggle">Show All Picks</Label>
                <p className="text-sm text-muted-foreground">
                  Override deadline and show all picks on the leaderboard
                </p>
              </div>
              <Switch
                id="show-picks-toggle"
                checked={pool.showPicksOverride || false}
                onCheckedChange={(checked) => {
                  updatePoolMutation.mutate({ showPicksOverride: checked });
                }}
                data-testid="switch-show-picks"
              />
            </div>
            <div className="pt-2 border-t">
              <label className="block text-sm font-medium mb-2">Webhook URL (for pick notifications)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://your-n8n-webhook-url.com/..."
                  defaultValue={pool.webhookUrl || ""}
                  onBlur={(e) => {
                    const newUrl = e.target.value.trim();
                    if (newUrl !== (pool.webhookUrl || "")) {
                      updatePoolMutation.mutate({ webhookUrl: newUrl || null });
                    }
                  }}
                  data-testid="input-webhook-url"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                n8n webhook URL to send pick confirmation emails when participants submit picks
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Make Pick Dialog */}
        <Dialog open={showMakePickDialog} onOpenChange={(open) => {
          setShowMakePickDialog(open);
          if (!open) {
            setSelectedEntryForPick(null);
            setSelectedGolfer(null);
            setPickSearchQuery("");
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Make Pick for {selectedEntryForPick?.entryName}</DialogTitle>
              <DialogDescription>
                Select a golfer for Week {pool.currentWeek}
                {currentTournament && ` - ${currentTournament.name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search golfers..."
                  value={pickSearchQuery}
                  onChange={(e) => setPickSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-golfer-search"
                />
              </div>
              <div className="flex-1 overflow-y-auto border rounded-md">
                {filteredGolfers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {fieldData ? "No golfers found" : "Loading tournament field..."}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredGolfers.slice(0, 50).map((golfer) => {
                      const isUsed = usedGolfersForSelectedEntry.includes(golfer.name);
                      return (
                        <div
                          key={golfer.datagolfId}
                          className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                            isUsed
                              ? "bg-muted/50 opacity-50 cursor-not-allowed"
                              : selectedGolfer?.datagolfId === golfer.datagolfId
                              ? "bg-primary/10"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            if (!isUsed) {
                              setSelectedGolfer(golfer);
                            }
                          }}
                          data-testid={`golfer-option-${golfer.datagolfId}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-8">
                              #{golfer.ranking || "—"}
                            </span>
                            <span className="font-medium">{golfer.name}</span>
                            <span className="text-sm text-muted-foreground">{golfer.country}</span>
                          </div>
                          {isUsed && (
                            <Badge variant="secondary">Already Used</Badge>
                          )}
                          {selectedGolfer?.datagolfId === golfer.datagolfId && !isUsed && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMakePickDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedEntryForPick && selectedGolfer && pool.currentWeek) {
                    adminPickMutation.mutate({
                      entryId: selectedEntryForPick.id,
                      golferName: selectedGolfer.name,
                      weekNumber: pool.currentWeek,
                      tournamentName: currentTournament?.name,
                    });
                  }
                }}
                disabled={!selectedGolfer || adminPickMutation.isPending}
                data-testid="button-confirm-pick"
              >
                {adminPickMutation.isPending ? "Submitting..." : "Submit Pick"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
