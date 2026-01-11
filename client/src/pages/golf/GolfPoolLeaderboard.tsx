import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trophy, Users, Check, X, CircleDot, EyeOff, Clock } from "lucide-react";
import { format } from "date-fns";

type LeaderboardEntry = {
  id: string;
  entryName: string;
  status: string;
  eliminatedWeek: number | null;
  picks: Array<{
    id: string;
    weekNumber: number;
    golferName: string;
    tournamentName: string | null;
    result: string;
    masked?: boolean;
  }>;
};

type LeaderboardData = {
  pool: {
    id: string;
    name: string;
    season: number;
    currentWeek: number;
    status: string;
    pickDeadlineHours?: number;
  };
  deadlinePassed: boolean;
  deadlineTime: string | null;
  entries: LeaderboardEntry[];
};

export default function GolfPoolLeaderboard() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const poolId = params.poolId || "";

  const { data: leaderboard, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/public/golf/pools", poolId, "leaderboard"],
    queryFn: async () => {
      const response = await fetch(`/api/public/golf/pools/${poolId}/leaderboard`);
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Pool not found</p>
      </div>
    );
  }

  const { pool, entries, deadlinePassed, deadlineTime } = leaderboard;
  const activeEntries = entries.filter((e) => e.status === "active");
  const eliminatedEntries = entries.filter((e) => e.status === "eliminated");
  const maxWeek = Math.max(pool.currentWeek || 1, ...entries.flatMap((e) => e.picks.map((p) => p.weekNumber)));
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);
  
  const formattedDeadline = deadlineTime ? format(new Date(deadlineTime), "EEE, MMM d 'at' h:mm a") : null;

  const getPickForWeek = (entry: LeaderboardEntry, week: number) => {
    return entry.picks.find((p) => p.weekNumber === week);
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "survived":
        return <Check className="h-4 w-4 text-green-600" />;
      case "eliminated":
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <CircleDot className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/golf/pool/${poolId}/signup`)}
            className="mb-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pool
          </Button>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                {pool.name} Leaderboard
              </h1>
              <p className="text-muted-foreground">
                Season {pool.season} - Week {pool.currentWeek}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium text-green-600">{activeEntries.length}</span> active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium text-destructive">{eliminatedEntries.length}</span> eliminated
                </span>
              </div>
            </div>
          </div>
          {!deadlinePassed && formattedDeadline && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Week {pool.currentWeek} picks hidden until {formattedDeadline}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All Entries ({entries.length})</TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-active">Active ({activeEntries.length})</TabsTrigger>
            <TabsTrigger value="eliminated" data-testid="tab-eliminated">Eliminated ({eliminatedEntries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <LeaderboardTable entries={entries} weeks={weeks} getPickForWeek={getPickForWeek} getResultBadge={getResultBadge} currentWeek={pool.currentWeek} />
          </TabsContent>

          <TabsContent value="active">
            <LeaderboardTable entries={activeEntries} weeks={weeks} getPickForWeek={getPickForWeek} getResultBadge={getResultBadge} currentWeek={pool.currentWeek} />
          </TabsContent>

          <TabsContent value="eliminated">
            <LeaderboardTable entries={eliminatedEntries} weeks={weeks} getPickForWeek={getPickForWeek} getResultBadge={getResultBadge} currentWeek={pool.currentWeek} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function LeaderboardTable({
  entries,
  weeks,
  getPickForWeek,
  getResultBadge,
  currentWeek,
}: {
  entries: LeaderboardEntry[];
  weeks: number[];
  getPickForWeek: (entry: LeaderboardEntry, week: number) => LeaderboardEntry["picks"][0] | undefined;
  getResultBadge: (result: string) => JSX.Element;
  currentWeek: number;
}) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No entries to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Picks by Week</CardTitle>
        <CardDescription>View all entries and their weekly picks</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Entry</TableHead>
              <TableHead className="text-center min-w-[80px]">Status</TableHead>
              {weeks.map((week) => (
                <TableHead key={week} className={`text-center min-w-[120px] ${week === currentWeek ? "bg-primary/10" : ""}`}>
                  Week {week}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} className={entry.status === "eliminated" ? "opacity-60" : ""}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium">
                  {entry.entryName}
                </TableCell>
                <TableCell className="text-center">
                  {entry.status === "active" ? (
                    <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">Out (W{entry.eliminatedWeek})</Badge>
                  )}
                </TableCell>
                {weeks.map((week) => {
                  const pick = getPickForWeek(entry, week);
                  const isCurrentWeek = week === currentWeek;
                  
                  return (
                    <TableCell
                      key={week}
                      className={`text-center ${isCurrentWeek ? "bg-primary/5" : ""}`}
                    >
                      {pick ? (
                        pick.masked ? (
                          <div className="flex flex-col items-center gap-1">
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Hidden</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-medium truncate max-w-[100px]" title={pick.golferName}>
                              {pick.golferName}
                            </span>
                            {getResultBadge(pick.result)}
                          </div>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
