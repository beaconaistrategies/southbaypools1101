import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Trophy, Search, ChevronDown, Clock, Users, DollarSign } from "lucide-react";

type GolferDetail = {
  tier: number;
  dgId: number;
  name: string;
  position: string | null;
  earnings: number;
  status: string;
};

type RankingEntry = {
  entryId: string;
  entryName: string;
  email: string;
  rank: number;
  totalEarnings: number;
  golfers: GolferDetail[];
};

type ScoreboardData = {
  pool: {
    id: string;
    name: string;
    tournamentName: string;
    season: number;
    status: string;
    entryFee: string | null;
  };
  rankings: RankingEntry[];
  lastUpdated: string | null;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "cut":
      return <Badge variant="destructive" className="text-[10px] px-1">CUT</Badge>;
    case "wd":
      return <Badge variant="secondary" className="text-[10px] px-1">WD</Badge>;
    case "dq":
      return <Badge variant="secondary" className="text-[10px] px-1">DQ</Badge>;
    default:
      return null;
  }
}

function getRankDisplay(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

const TIER_LABELS: Record<number, string> = {
  1: "T1",
  2: "T2",
  3: "T3",
  4: "T4",
};

const TIER_DOT_COLORS: Record<number, string> = {
  1: "bg-yellow-500",
  2: "bg-blue-500",
  3: "bg-green-500",
  4: "bg-purple-500",
};

export default function EarningsPoolScoreboard() {
  const params = useParams();
  const poolId = params.poolId || "";
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ScoreboardData>({
    queryKey: ["earnings-scoreboard", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/earnings-pools/${poolId}/scoreboard`);
      if (!res.ok) throw new Error("Failed to load scoreboard");
      return res.json();
    },
    refetchInterval: 60_000, // Auto-refresh every 60 seconds
  });

  const filteredRankings = useMemo(() => {
    if (!data?.rankings) return [];
    if (!searchTerm) return data.rankings;
    const lower = searchTerm.toLowerCase();
    return data.rankings.filter(
      (r) =>
        r.entryName.toLowerCase().includes(lower) ||
        r.golfers.some((g) => g.name.toLowerCase().includes(lower))
    );
  }, [data?.rankings, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading scoreboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Failed to load scoreboard</p>
      </div>
    );
  }

  const { pool, rankings, lastUpdated } = data;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {pool.name}
          </CardTitle>
          <CardDescription>{pool.tournamentName} - {pool.season}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {rankings.length} entries
              </span>
              {pool.entryFee && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {pool.entryFee}
                </span>
              )}
            </div>
            {lastUpdated && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
          {pool.status === "live" && (
            <Badge variant="default" className="mt-2 bg-green-600">
              LIVE
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or golfer..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Rankings List */}
      {filteredRankings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {rankings.length === 0
                ? "No entries yet. Scores will appear once the tournament begins."
                : "No entries match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {/* Column headers */}
          <div className="flex items-center px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
            <span className="w-12">Rank</span>
            <span className="flex-1">Entry</span>
            <span className="text-right w-24">Earnings</span>
          </div>

          {filteredRankings.map((entry) => (
            <Collapsible
              key={entry.entryId}
              open={expandedId === entry.entryId}
              onOpenChange={(open) => setExpandedId(open ? entry.entryId : null)}
            >
              <CollapsibleTrigger className="w-full">
                <div
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors cursor-pointer
                    ${entry.rank <= 3 ? "bg-yellow-500/5" : "hover:bg-accent"}
                    ${expandedId === entry.entryId ? "bg-accent" : ""}
                  `}
                >
                  <span
                    className={`w-12 text-left font-bold text-sm
                      ${entry.rank === 1 ? "text-yellow-600" : ""}
                      ${entry.rank === 2 ? "text-gray-500" : ""}
                      ${entry.rank === 3 ? "text-amber-700" : ""}
                    `}
                  >
                    {entry.rank <= 3 ? getRankDisplay(entry.rank) : entry.rank}
                  </span>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-sm">{entry.entryName}</span>
                    {/* Golfer dots */}
                    <div className="flex gap-1 mt-0.5">
                      {entry.golfers.map((g) => (
                        <div
                          key={g.tier}
                          className={`w-1.5 h-1.5 rounded-full ${TIER_DOT_COLORS[g.tier]} ${
                            g.status !== "active" ? "opacity-30" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="w-24 text-right font-semibold text-sm">
                    {formatCurrency(entry.totalEarnings)}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 ml-2 text-muted-foreground transition-transform
                      ${expandedId === entry.entryId ? "rotate-180" : ""}`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-3 pt-1">
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {entry.golfers.map((golfer) => (
                      <div
                        key={golfer.tier}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${TIER_DOT_COLORS[golfer.tier]}`}
                          />
                          <span className="text-xs font-medium text-muted-foreground w-6">
                            {TIER_LABELS[golfer.tier]}
                          </span>
                          <span className={golfer.status !== "active" ? "line-through opacity-50" : ""}>
                            {golfer.name}
                          </span>
                          {getStatusBadge(golfer.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          {golfer.position && (
                            <span className="text-xs text-muted-foreground">
                              {golfer.position}
                            </span>
                          )}
                          <span className="font-medium">
                            {formatCurrency(golfer.earnings)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between text-sm font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(entry.totalEarnings)}</span>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
