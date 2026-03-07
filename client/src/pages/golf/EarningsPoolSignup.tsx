import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Users, DollarSign, Check, Search, ChevronRight } from "lucide-react";

type PoolInfo = {
  id: string;
  name: string;
  tournamentName: string;
  season: number;
  status: string;
  entryFee: string | null;
  notes: string | null;
  maxEntriesPerEmail: number;
  entryCount: number;
};

type Golfer = {
  id: string;
  dgId: number;
  name: string;
  country: string | null;
  tier: number;
  dgRank: number | null;
  owgrRank: number | null;
};

type GolfersByTier = {
  golfers: Golfer[];
  tiers: Record<number, Golfer[]>;
};

const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 - Elite",
  2: "Tier 2 - Contenders",
  3: "Tier 3 - Mid-Field",
  4: "Tier 4 - Long Shots",
};

const TIER_COLORS: Record<number, string> = {
  1: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700",
  2: "bg-blue-500/10 border-blue-500/30 text-blue-700",
  3: "bg-green-500/10 border-green-500/30 text-green-700",
  4: "bg-purple-500/10 border-purple-500/30 text-purple-700",
};

export default function EarningsPoolSignup() {
  const params = useParams();
  const poolId = params.poolId || "";
  const { toast } = useToast();

  const [entryName, setEntryName] = useState("");
  const [email, setEmail] = useState("");
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: pool, isLoading: poolLoading } = useQuery<PoolInfo>({
    queryKey: ["earnings-pool-public", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/earnings-pools/${poolId}/public`);
      if (!res.ok) throw new Error("Pool not found");
      return res.json();
    },
  });

  const { data: golferData, isLoading: golfersLoading } = useQuery<GolfersByTier>({
    queryKey: ["earnings-pool-golfers", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/earnings-pools/${poolId}/golfers`);
      if (!res.ok) throw new Error("Failed to load golfers");
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: {
      entryName: string;
      email: string;
      tier1GolferId: string;
      tier2GolferId: string;
      tier3GolferId: string;
      tier4GolferId: string;
    }) => {
      const res = await fetch(`/api/earnings-pools/${poolId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit entry");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Entry submitted!", description: "Your picks have been locked in." });
      queryClient.invalidateQueries({ queryKey: ["earnings-pool-public", poolId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const allSelected = selections[1] && selections[2] && selections[3] && selections[4];
  const canSubmit = entryName.trim() && email.trim() && allSelected && !submitMutation.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    submitMutation.mutate({
      entryName: entryName.trim(),
      email: email.trim().toLowerCase(),
      tier1GolferId: selections[1],
      tier2GolferId: selections[2],
      tier3GolferId: selections[3],
      tier4GolferId: selections[4],
    });
  }

  if (poolLoading || golfersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading pool...</p>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Pool not found</p>
      </div>
    );
  }

  if (pool.status !== "open") {
    return (
      <div className="max-w-lg mx-auto p-4 mt-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{pool.name}</CardTitle>
            <CardDescription>This pool is no longer accepting entries.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto p-4 mt-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-100 rounded-full p-3 w-fit mb-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Entry Submitted!</CardTitle>
            <CardDescription>
              Your picks for {pool.tournamentName} have been locked in. Good luck!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Submit Another Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tiers = golferData?.tiers || {};

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {pool.name}
          </CardTitle>
          <CardDescription>{pool.tournamentName} - {pool.season}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {pool.entryFee && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {pool.entryFee}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {pool.entryCount} entries
            </span>
          </div>
          {pool.notes && <p className="text-sm mt-3">{pool.notes}</p>}
        </CardContent>
      </Card>

      {/* Entry Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label htmlFor="entryName">Entry Name</Label>
          <Input
            id="entryName"
            placeholder="Your name or team name"
            value={entryName}
            onChange={(e) => setEntryName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {/* Tier Selections */}
      {[1, 2, 3, 4].map((tier) => (
        <TierSelector
          key={tier}
          tier={tier}
          golfers={tiers[tier] || []}
          selectedId={selections[tier] || null}
          searchTerm={searchTerms[tier] || ""}
          onSearch={(term) => setSearchTerms((prev) => ({ ...prev, [tier]: term }))}
          onSelect={(golferId) => setSelections((prev) => ({ ...prev, [tier]: golferId }))}
        />
      ))}

      {/* Submit Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Entry"}
          </Button>
          {!allSelected && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              Select one golfer from each tier to submit
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TierSelector({
  tier,
  golfers,
  selectedId,
  searchTerm,
  onSearch,
  onSelect,
}: {
  tier: number;
  golfers: Golfer[];
  selectedId: string | null;
  searchTerm: string;
  onSearch: (term: string) => void;
  onSelect: (id: string) => void;
}) {
  const filtered = useMemo(() => {
    if (!searchTerm) return golfers;
    const lower = searchTerm.toLowerCase();
    return golfers.filter((g) => g.name.toLowerCase().includes(lower));
  }, [golfers, searchTerm]);

  const selectedGolfer = golfers.find((g) => g.id === selectedId);

  return (
    <Card className={`mb-4 border ${selectedId ? "border-primary/50" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            <Badge variant="outline" className={TIER_COLORS[tier]}>
              {TIER_LABELS[tier]}
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">{golfers.length} golfers</span>
        </div>
        {selectedGolfer && (
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Check className="h-4 w-4" />
            {selectedGolfer.name}
            {selectedGolfer.dgRank && (
              <span className="text-xs text-muted-foreground">#{selectedGolfer.dgRank}</span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search golfers..."
            className="pl-8 h-9"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="h-48">
          <div className="space-y-1">
            {filtered.map((golfer) => (
              <button
                key={golfer.id}
                onClick={() => onSelect(golfer.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors
                  ${golfer.id === selectedId
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span>{golfer.name}</span>
                  {golfer.country && (
                    <span className="text-xs opacity-60">{golfer.country}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {golfer.dgRank && (
                    <span className="text-xs opacity-70">DG #{golfer.dgRank}</span>
                  )}
                  {golfer.owgrRank && (
                    <span className="text-xs opacity-70">OWGR #{golfer.owgrRank}</span>
                  )}
                  {golfer.id === selectedId && <Check className="h-3 w-3" />}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No golfers match your search
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
