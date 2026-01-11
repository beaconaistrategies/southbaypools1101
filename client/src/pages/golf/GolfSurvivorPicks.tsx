import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { GolfPool, GolfPoolEntry, GolfTournament, GolfPick } from "@shared/schema";
import { ArrowLeft, Trophy, Calendar, CircleDot, Check, X, Flag, User, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

type GolferWithRanking = {
  dgId: number;
  name: string;
  country: string;
  dgRank: number | null;
  owgrRank: number | null;
  skillEstimate: number | null;
  inField: boolean;
};

type TournamentField = {
  eventName: string;
  eventId: string;
  tour: string;
  lastUpdated: string;
  golfers: GolferWithRanking[];
};

type PoolWithDetails = GolfPool & {
  entries: GolfPoolEntry[];
  currentTournament?: GolfTournament;
};

type EntryWithPicks = GolfPoolEntry & {
  picks: GolfPick[];
};

export default function GolfSurvivorPicks() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const poolId = params.poolId || "";
  const entryId = params.entryId || "";
  const { toast } = useToast();
  const [showPickDialog, setShowPickDialog] = useState(false);
  const [golferName, setGolferName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGolfer, setSelectedGolfer] = useState<GolferWithRanking | null>(null);

  const { data: pool } = useQuery<PoolWithDetails>({
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

  const entry = pool?.entries?.find((e) => e.id === entryId);
  const currentTournament = tournaments.find((t) => t.weekNumber === pool?.currentWeek);
  const usedGolfers = (entry?.usedGolfers as string[]) || [];
  
  const { data: picks = [] } = useQuery<GolfPick[]>({
    queryKey: ["/api/golf/entries", entryId, "picks"],
    queryFn: async () => {
      const response = await fetch(`/api/golf/entries/${entryId}/picks`);
      if (!response.ok) throw new Error("Failed to fetch picks");
      return response.json();
    },
    enabled: !!entryId,
  });

  const { data: dataGolfStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/datagolf/status"],
  });

  const { data: fieldData, isLoading: fieldLoading } = useQuery<TournamentField>({
    queryKey: ["/api/datagolf/field"],
    queryFn: async () => {
      const response = await fetch("/api/datagolf/field?tour=pga");
      if (!response.ok) throw new Error("Failed to fetch field");
      return response.json();
    },
    enabled: dataGolfStatus?.configured === true,
    retry: false,
  });

  const currentWeekPick = picks.find((p) => p.weekNumber === pool?.currentWeek);

  const filteredGolfers = useMemo(() => {
    if (!fieldData?.golfers) return [];
    
    let golfers = fieldData.golfers;
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      golfers = golfers.filter(g => g.name.toLowerCase().includes(lowerQuery));
    }
    
    return golfers;
  }, [fieldData?.golfers, searchQuery]);

  const makePickMutation = useMutation({
    mutationFn: async (data: { golferName: string; tournamentId?: string; tournamentName?: string; weekNumber: number }) => {
      return await apiRequest("POST", `/api/golf/entries/${entryId}/picks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/golf/pools", poolId] });
      queryClient.invalidateQueries({ queryKey: ["/api/golf/entries", entryId, "picks"] });
      toast({ title: "Pick Submitted", description: "Your golfer pick has been recorded." });
      setShowPickDialog(false);
      setGolferName("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleMakePick = () => {
    const nameToSubmit = selectedGolfer?.name || golferName.trim();
    if (nameToSubmit && pool?.currentWeek) {
      const tournamentName = currentTournament?.name || fieldData?.eventName || `Week ${pool.currentWeek}`;
      makePickMutation.mutate({
        golferName: nameToSubmit,
        tournamentId: currentTournament?.id,
        tournamentName: tournamentName,
        weekNumber: pool.currentWeek,
      });
    }
  };

  const handleSelectGolfer = (golfer: GolferWithRanking) => {
    setSelectedGolfer(golfer);
    setGolferName(golfer.name);
  };

  const isGolferUsed = (name: string) => {
    return usedGolfers.some((g) => g.toLowerCase() === name.toLowerCase());
  };

  if (!pool || !entry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/join")}
            className="mb-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Entries
          </Button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{pool.name}</h1>
              <p className="text-muted-foreground">{entry.entryName}</p>
            </div>
            {entry.status === "active" ? (
              <Badge className="bg-green-600 text-white">Active</Badge>
            ) : (
              <Badge variant="destructive">Eliminated (Week {entry.eliminatedWeek})</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {entry.status === "eliminated" ? (
          <Card className="mb-8">
            <CardContent className="py-8 text-center">
              <X className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">You've Been Eliminated</h3>
              <p className="text-muted-foreground">
                Your entry was eliminated in Week {entry.eliminatedWeek}. Better luck next time!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Week {pool.currentWeek}: {fieldData?.eventName || currentTournament?.name || "No tournament"}
              </CardTitle>
              {currentTournament && (
                <CardDescription>
                  {format(new Date(currentTournament.startDate), "MMM d")} - {format(new Date(currentTournament.endDate), "MMM d, yyyy")}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {currentWeekPick ? (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{currentWeekPick.golferName}</p>
                      <p className="text-sm text-muted-foreground">Your pick for this week</p>
                    </div>
                  </div>
                  {currentWeekPick.result === "pending" ? (
                    <Badge variant="secondary">Pending</Badge>
                  ) : currentWeekPick.result === "survived" ? (
                    <Badge className="bg-green-600 text-white">Survived</Badge>
                  ) : (
                    <Badge variant="destructive">Eliminated</Badge>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">You haven't made a pick for this week yet.</p>
                  <Dialog open={showPickDialog} onOpenChange={(open) => {
                    setShowPickDialog(open);
                    if (!open) {
                      setSearchQuery("");
                      setSelectedGolfer(null);
                      setGolferName("");
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-make-pick">
                        <Flag className="h-4 w-4 mr-2" />
                        Make Your Pick
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Pick a Golfer</DialogTitle>
                        <DialogDescription>
                          {fieldData?.eventName ? (
                            <>Select from {fieldData.eventName} field. You cannot use the same golfer twice.</>
                          ) : (
                            <>Choose a golfer for {currentTournament?.name}. You cannot use the same golfer twice.</>
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {dataGolfStatus?.configured && fieldData?.golfers ? (
                        <div className="flex-1 overflow-hidden flex flex-col">
                          <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search golfers..."
                              className="pl-10"
                              data-testid="input-search-golfer"
                            />
                          </div>
                          
                          {selectedGolfer && (
                            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                              <div>
                                <p className="font-medium">{selectedGolfer.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  DG Rank: #{selectedGolfer.dgRank || "N/A"} | OWGR: #{selectedGolfer.owgrRank || "N/A"}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedGolfer(null);
                                  setGolferName("");
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          
                          <ScrollArea className="h-[350px]">
                            <div className="space-y-1 pr-4">
                              {fieldLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              ) : filteredGolfers.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No golfers found</p>
                              ) : (
                                filteredGolfers.map((golfer) => {
                                  const used = isGolferUsed(golfer.name);
                                  const isSelected = selectedGolfer?.dgId === golfer.dgId;
                                  
                                  return (
                                    <button
                                      key={golfer.dgId}
                                      onClick={() => !used && handleSelectGolfer(golfer)}
                                      disabled={used}
                                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between gap-2 ${
                                        isSelected 
                                          ? "bg-primary/20 border border-primary" 
                                          : used 
                                            ? "opacity-50 cursor-not-allowed bg-muted/50" 
                                            : "hover-elevate bg-muted/30"
                                      }`}
                                      data-testid={`golfer-${golfer.dgId}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                          {golfer.dgRank || "-"}
                                        </div>
                                        <div>
                                          <p className="font-medium">{golfer.name}</p>
                                          <p className="text-xs text-muted-foreground">{golfer.country}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {used && (
                                          <Badge variant="secondary" className="text-xs">Used</Badge>
                                        )}
                                        {golfer.owgrRank && (
                                          <Badge variant="outline" className="text-xs">
                                            OWGR #{golfer.owgrRank}
                                          </Badge>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <div className="py-4">
                          <label className="text-sm font-medium">Golfer Name</label>
                          <Input
                            value={golferName}
                            onChange={(e) => setGolferName(e.target.value)}
                            placeholder="e.g., Scottie Scheffler"
                            data-testid="input-golfer-name"
                          />
                          {golferName && isGolferUsed(golferName) && (
                            <p className="text-sm text-destructive mt-2">
                              You've already used this golfer in a previous week.
                            </p>
                          )}
                        </div>
                      )}
                      
                      <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setShowPickDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleMakePick}
                          disabled={!golferName || isGolferUsed(golferName) || makePickMutation.isPending}
                          data-testid="button-submit-pick"
                        >
                          {makePickMutation.isPending ? "Submitting..." : "Submit Pick"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pick History</CardTitle>
            <CardDescription>
              Golfers you've used this season ({usedGolfers.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {picks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No picks yet.</p>
            ) : (
              <div className="space-y-3">
                {picks
                  .sort((a, b) => a.weekNumber - b.weekNumber)
                  .map((pick) => {
                    const tournament = tournaments.find((t) => t.id === pick.tournamentId);
                    return (
                      <div
                        key={pick.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        data-testid={`pick-week-${pick.weekNumber}`}
                      >
                        <div>
                          <p className="font-medium">{pick.golferName}</p>
                          <p className="text-sm text-muted-foreground">
                            Week {pick.weekNumber}: {pick.tournamentName || tournament?.name || "Unknown"}
                          </p>
                        </div>
                        {pick.result === "pending" ? (
                          <Badge variant="secondary">Pending</Badge>
                        ) : pick.result === "survived" ? (
                          <Badge className="bg-green-600 text-white">
                            <Check className="h-3 w-3 mr-1" />
                            Survived
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            Eliminated
                          </Badge>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {usedGolfers.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Used Golfers</CardTitle>
              <CardDescription>
                These golfers cannot be picked again
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {usedGolfers.map((golfer) => (
                  <Badge key={golfer} variant="outline" className="text-muted-foreground">
                    {golfer}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
