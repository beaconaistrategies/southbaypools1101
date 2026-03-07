import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Medal, ArrowLeft, Users, Trophy, BarChart3 } from "lucide-react";

type EarningsPoolSummary = {
  id: string;
  name: string;
  slug: string | null;
  tournamentName: string;
  season: number;
  status: string;
  entryFee: string | null;
  entryCount: number;
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  setup: { label: "Coming Soon", variant: "secondary" },
  open: { label: "Open for Entries", variant: "default" },
  locked: { label: "Locked", variant: "outline" },
  live: { label: "Live", variant: "destructive" },
  completed: { label: "Final", variant: "secondary" },
};

export default function GolfMajorsHub() {
  const { data: pools = [], isLoading } = useQuery<EarningsPoolSummary[]>({
    queryKey: ["/api/earnings-pools/public/list"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-600" />
            <span className="text-xl font-bold">Golf Majors Pools</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Golf Majors Pools</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pick one golfer from each tier. Your team's combined tournament earnings determine your rank.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading pools...</p>
          </div>
        ) : pools.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <Medal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pools Yet</h3>
              <p className="text-muted-foreground">
                Check back soon — pools for upcoming majors will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {pools.map((pool) => {
              const badge = STATUS_BADGE[pool.status] || STATUS_BADGE.setup;
              const isOpen = pool.status === "open";
              const hasScoreboard = ["locked", "live", "completed"].includes(pool.status);

              return (
                <Card key={pool.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{pool.name}</CardTitle>
                        <CardDescription>{pool.tournamentName}</CardDescription>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end gap-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {pool.entryCount} {pool.entryCount === 1 ? "entry" : "entries"}
                      </span>
                      {pool.entryFee && (
                        <span className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          {pool.entryFee}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isOpen && (
                        <Link href={`/golf/earnings/${pool.id}/signup`} className="flex-1">
                          <Button className="w-full">Enter Pool</Button>
                        </Link>
                      )}
                      {hasScoreboard && (
                        <Link href={`/golf/earnings/${pool.id}/scoreboard`} className="flex-1">
                          <Button variant={isOpen ? "outline" : "default"} className="w-full gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Scoreboard
                          </Button>
                        </Link>
                      )}
                      {pool.status === "setup" && (
                        <Button variant="outline" className="w-full" disabled>
                          Coming Soon
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
