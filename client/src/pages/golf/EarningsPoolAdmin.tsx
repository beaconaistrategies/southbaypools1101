import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Trophy,
  Users,
  RefreshCw,
  Play,
  Square,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Settings,
} from "lucide-react";
import type { EarningsPool, EarningsPoolGolfer, EarningsPoolEntry } from "@shared/schema";

type GolfersByTier = {
  golfers: EarningsPoolGolfer[];
  tiers: Record<number, EarningsPoolGolfer[]>;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 - Elite",
  2: "Tier 2 - Contenders",
  3: "Tier 3 - Mid-Field",
  4: "Tier 4 - Long Shots",
};

export default function EarningsPoolAdmin() {
  const params = useParams();
  const poolId = params.id || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: pool, isLoading } = useQuery<EarningsPool>({
    queryKey: ["admin-earnings-pool", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/earnings-pools/${poolId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Pool not found");
      return res.json();
    },
  });

  const { data: golferData } = useQuery<GolfersByTier>({
    queryKey: ["admin-earnings-golfers", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/earnings-pools/${poolId}/golfers`);
      if (!res.ok) throw new Error("Failed to load golfers");
      return res.json();
    },
  });

  const { data: entries } = useQuery<EarningsPoolEntry[]>({
    queryKey: ["admin-earnings-entries", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/earnings-pools/${poolId}/entries`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load entries");
      return res.json();
    },
  });

  const populateFieldMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/earnings-pools/${poolId}/populate-field`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to populate field");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Field populated!",
        description: `${data.totalGolfers} golfers loaded for ${data.eventName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings-golfers", poolId] });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings-pool", poolId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const refreshScoresMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/earnings-pools/${poolId}/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to refresh scores");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Scores refreshed!", description: `${data.entryCount} entries re-ranked.` });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings-pool", poolId] });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings-entries", poolId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const scoringLoopMutation = useMutation({
    mutationFn: async (action: "start" | "stop") => {
      const res = await fetch(`/api/earnings-pools/${poolId}/scoring-loop`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to manage scoring loop");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings-pool", poolId] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/earnings-pools/${poolId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings-pool", poolId] });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`/api/earnings-pools/${poolId}/entries/${entryId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete entry");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Entry deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings-entries", poolId] });
    },
  });

  const updatePurseMutation = useMutation({
    mutationFn: async (purseDollars: number) => {
      const res = await fetch(`/api/earnings-pools/${poolId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purseTotalCents: purseDollars * 100 }),
      });
      if (!res.ok) throw new Error("Failed to update purse");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Purse updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings-pool", poolId] });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }

  if (!pool) {
    return <div className="flex items-center justify-center min-h-screen"><p>Pool not found</p></div>;
  }

  const tiers = golferData?.tiers || {};
  const totalGolfers = golferData?.golfers?.length || 0;
  const signupUrl = `${window.location.origin}/golf/earnings/${poolId}/signup`;
  const scoreboardUrl = `${window.location.origin}/golf/earnings/${poolId}/scoreboard`;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/golf")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            {pool.name}
          </h1>
          <p className="text-muted-foreground">{pool.tournamentName} - {pool.season}</p>
        </div>
        <Badge
          variant={pool.status === "live" ? "default" : "outline"}
          className={pool.status === "live" ? "bg-green-600" : ""}
        >
          {pool.status?.toUpperCase()}
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => populateFieldMutation.mutate()}
          disabled={populateFieldMutation.isPending}
        >
          <Download className="h-4 w-4" />
          {populateFieldMutation.isPending ? "Loading..." : "Import Field"}
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => refreshScoresMutation.mutate()}
          disabled={refreshScoresMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 ${refreshScoresMutation.isPending ? "animate-spin" : ""}`} />
          Refresh Scores
        </Button>
        <Button
          variant={pool.status === "live" ? "destructive" : "default"}
          className="flex items-center gap-2"
          onClick={() => {
            if (pool.status === "live") {
              scoringLoopMutation.mutate("stop");
            } else {
              scoringLoopMutation.mutate("start");
            }
          }}
        >
          {pool.status === "live" ? (
            <><Square className="h-4 w-4" /> Stop Live</>
          ) : (
            <><Play className="h-4 w-4" /> Go Live</>
          )}
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => {
            const newStatus = pool.status === "open" ? "locked" : "open";
            updateStatusMutation.mutate(newStatus);
          }}
        >
          <Settings className="h-4 w-4" />
          {pool.status === "open" ? "Lock Entries" : "Open Entries"}
        </Button>
      </div>

      {/* Share Links */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Share Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Input value={signupUrl} readOnly className="text-xs" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { navigator.clipboard.writeText(signupUrl); toast({ title: "Copied!" }); }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={signupUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input value={scoreboardUrl} readOnly className="text-xs" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { navigator.clipboard.writeText(scoreboardUrl); toast({ title: "Copied!" }); }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={scoreboardUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="entries">
        <TabsList className="w-full">
          <TabsTrigger value="entries" className="flex-1">
            Entries ({entries?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="field" className="flex-1">
            Field ({totalGolfers})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Entries</CardTitle>
              <CardDescription>{entries?.length || 0} total entries</CardDescription>
            </CardHeader>
            <CardContent>
              {!entries || entries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No entries yet</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium text-sm">{entry.entryName}</p>
                          <p className="text-xs text-muted-foreground">{entry.email}</p>
                          {entry.currentRank && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Rank #{entry.currentRank} - {formatCurrency(entry.totalEarningsCents)}
                            </Badge>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {entry.entryName}'s entry.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteEntryMutation.mutate(entry.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="field">
          <Card>
            <CardHeader>
              <CardTitle>Golfer Field</CardTitle>
              <CardDescription>
                {totalGolfers} golfers across 4 tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalGolfers === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No golfers loaded yet. Import the field from DataGolf.
                  </p>
                  <Button onClick={() => populateFieldMutation.mutate()}>
                    <Download className="h-4 w-4 mr-2" />
                    Import Field
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((tier) => (
                    <div key={tier}>
                      <h4 className="font-medium text-sm mb-2">
                        {TIER_LABELS[tier]} ({tiers[tier]?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                        {tiers[tier]?.map((g) => (
                          <div
                            key={g.id}
                            className="text-xs px-2 py-1 rounded bg-muted flex justify-between"
                          >
                            <span>{g.name}</span>
                            <span className="text-muted-foreground">
                              {g.dgRank ? `#${g.dgRank}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Pool Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PurseInput
                currentPurse={pool.purseTotalCents || 0}
                onSave={(dollars) => updatePurseMutation.mutate(dollars)}
                isPending={updatePurseMutation.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PurseInput({
  currentPurse,
  onSave,
  isPending,
}: {
  currentPurse: number;
  onSave: (dollars: number) => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState(String(currentPurse / 100));

  return (
    <div>
      <Label htmlFor="purse">Tournament Purse (USD)</Label>
      <div className="flex gap-2 mt-1">
        <Input
          id="purse"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 20000000"
        />
        <Button
          onClick={() => onSave(Number(value))}
          disabled={isPending}
        >
          Save
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Current: {formatCurrency(currentPurse)}
      </p>
    </div>
  );
}
