import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import ContestCard from "@/components/ContestCard";
import EmptyState from "@/components/EmptyState";
import { Grid3x3 } from "lucide-react";
import type { Contest } from "@shared/schema";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  
  const { data: contests = [], isLoading } = useQuery<Contest[]>({
    queryKey: ["/api/contests"],
  });

  const { data: allSquares = {} } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/contests/squares"],
    queryFn: async () => {
      const squaresByContest: Record<string, any[]> = {};
      for (const contest of contests) {
        const response = await fetch(`/api/contests/${contest.id}/squares`);
        squaresByContest[contest.id] = await response.json();
      }
      return squaresByContest;
    },
    enabled: contests.length > 0,
  });

  const handleNewContest = () => {
    setLocation("/admin/contest/new");
  };

  const handleManage = (id: string) => {
    setLocation(`/admin/contest/${id}`);
  };

  const handleViewPublic = (id: string) => {
    setLocation(`/board/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav
        title="SquareKeeper"
        actionLabel="New Contest"
        showAction={true}
        onAction={handleNewContest}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold">Contests</h2>
          <p className="text-muted-foreground mt-2">
            Manage your football squares pools
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading contests...</p>
          </div>
        ) : contests.length === 0 ? (
          <EmptyState
            icon={Grid3x3}
            title="No contests yet — create your first one."
            description="Start managing your football squares pools by creating a new contest."
            actionLabel="New Contest"
            onAction={handleNewContest}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contests.map((contest) => {
              const squares = allSquares[contest.id] || [];
              const takenSquares = squares.filter((s: any) => s.status === "taken").length;
              return (
                <ContestCard
                  key={contest.id}
                  id={contest.id}
                  name={contest.name}
                  eventDate={new Date(contest.eventDate)}
                  status={contest.status as "open" | "locked"}
                  topTeam={contest.topTeam}
                  leftTeam={contest.leftTeam}
                  takenSquares={takenSquares}
                  totalSquares={100}
                  onManage={handleManage}
                  onViewPublic={handleViewPublic}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
