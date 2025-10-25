import { useState } from "react";
import { useLocation } from "wouter";
import TopNav from "@/components/TopNav";
import ContestCard from "@/components/ContestCard";
import EmptyState from "@/components/EmptyState";
import { Grid3x3 } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  
  //todo: remove mock functionality
  const [contests] = useState([
    {
      id: "1",
      name: "Week 8: SF vs DAL",
      eventDate: new Date("2025-10-27"),
      status: "open" as const,
      topTeam: "San Francisco",
      leftTeam: "Dallas",
      takenSquares: 37,
      totalSquares: 100,
    },
    {
      id: "2",
      name: "Thanksgiving Classic: DET vs CHI",
      eventDate: new Date("2025-11-27"),
      status: "locked" as const,
      topTeam: "Detroit",
      leftTeam: "Chicago",
      takenSquares: 100,
      totalSquares: 100,
    },
  ]);

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

        {contests.length === 0 ? (
          <EmptyState
            icon={Grid3x3}
            title="No contests yet — create your first one."
            description="Start managing your football squares pools by creating a new contest."
            actionLabel="New Contest"
            onAction={handleNewContest}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contests.map((contest) => (
              <ContestCard
                key={contest.id}
                {...contest}
                onManage={handleManage}
                onViewPublic={handleViewPublic}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
