import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import TopNav from "@/components/TopNav";
import type { GolfPool, EarningsPool } from "@shared/schema";
import { Plus, Search, Trophy, Users, Calendar, CircleDot, Flag, DollarSign } from "lucide-react";
import { format } from "date-fns";

type GolfPoolWithCounts = GolfPool & {
  entryCount: number;
  activeCount: number;
};

export default function AdminGolfDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: pools = [], isLoading } = useQuery<GolfPoolWithCounts[]>({
    queryKey: ["/api/golf/pools"],
  });

  const handleNewPool = () => {
    setLocation("/admin/golf/pool/new");
  };

  const handleManage = (id: string) => {
    setLocation(`/admin/golf/pool/${id}`);
  };

  const filteredPools = pools
    .filter((pool) => {
      if (statusFilter !== "all" && pool.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return pool.name.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
      <TopNav
        title="Golf Survivor"
        actionLabel="New Pool"
        showAction={true}
        onAction={handleNewPool}
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold">Golf Survivor Pools</h2>
          <p className="text-muted-foreground mt-2">
            Manage your survivor-style golf pools
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-pools"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading pools...</p>
          </div>
        ) : filteredPools.length === 0 ? (
          <Card className="hover-elevate">
            <CardContent className="text-center py-12">
              <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No pools yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first Golf Survivor pool to get started.
              </p>
              <Button onClick={handleNewPool} data-testid="button-create-first-pool">
                <Plus className="h-4 w-4 mr-2" />
                Create Pool
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPools.map((pool) => (
              <Card
                key={pool.id}
                className="hover-elevate cursor-pointer"
                onClick={() => handleManage(pool.id)}
                data-testid={`card-pool-${pool.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{pool.name}</CardTitle>
                    {getStatusBadge(pool.status)}
                  </div>
                  <CardDescription>{pool.season} Season</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{pool.entryCount || 0} entries ({pool.activeCount || 0} active)</span>
                    </div>
                    {pool.currentWeek && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Week {pool.currentWeek}</span>
                      </div>
                    )}
                    {pool.entryFee && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CircleDot className="h-4 w-4" />
                        <span>Entry: {pool.entryFee}</span>
                      </div>
                    )}
                    {pool.prizePool && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Trophy className="h-4 w-4" />
                        <span>Prize: {pool.prizePool}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Earnings Pools Section */}
        <EarningsPoolsSection />
      </main>
    </div>
  );
}

function EarningsPoolsSection() {
  const [, setLocation] = useLocation();

  const { data: earningsPools = [], isLoading } = useQuery<EarningsPool[]>({
    queryKey: ["/api/earnings-pools"],
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-600 text-white">Open</Badge>;
      case "live":
        return <Badge className="bg-green-600 text-white">Live</Badge>;
      case "locked":
        return <Badge variant="secondary">Locked</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status || "Setup"}</Badge>;
    }
  };

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            Earnings Pools
          </h2>
          <p className="text-muted-foreground mt-1">
            Tiered golf earnings pools with automated scoring
          </p>
        </div>
        <Button onClick={() => setLocation("/admin/golf/earnings/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Earnings Pool
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : earningsPools.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No earnings pools yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first tiered earnings pool to get started.
            </p>
            <Button onClick={() => setLocation("/admin/golf/earnings/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Earnings Pool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {earningsPools.map((pool) => (
            <Card
              key={pool.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation(`/admin/golf/earnings/${pool.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{pool.name}</CardTitle>
                  {getStatusBadge(pool.status)}
                </div>
                <CardDescription>{pool.tournamentName} - {pool.season}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {pool.entryFee && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Entry: {pool.entryFee}</span>
                    </div>
                  )}
                  {pool.rankingsCacheUpdatedAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Last updated: {new Date(pool.rankingsCacheUpdatedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
