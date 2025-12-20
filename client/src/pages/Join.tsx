import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { LogIn, Grid3X3, Calendar, Trophy, LogOut, User, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { isUnauthorizedError } from "@/lib/authUtils";

type Participant = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

type ParticipantContest = {
  contestId: string;
  contestName: string;
  contestSlug: string | null;
  eventDate: string;
  topTeam: string;
  leftTeam: string;
  status: string;
  squareCount: number;
  squares: { index: number; entryName: string | null }[];
};

function useParticipantAuth() {
  const { data: participant, isLoading, error } = useQuery<Participant>({
    queryKey: ["/api/participant/user"],
    retry: false,
  });

  const isAuthenticated = !!participant && !error;
  const isParticipantError = error && !isUnauthorizedError(error);

  return {
    participant,
    isLoading,
    isAuthenticated,
    isParticipantError,
  };
}

export default function Join() {
  const { participant, isLoading, isAuthenticated } = useParticipantAuth();

  const { data: contests = [], isLoading: contestsLoading } = useQuery<ParticipantContest[]>({
    queryKey: ["/api/participant/contests"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Not signed in - show sign in page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/">
              <span className="text-xl font-bold cursor-pointer" data-testid="link-home">South Bay Pools</span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-8">
              <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h1 className="text-3xl font-bold mb-2">Join South Bay Pools</h1>
              <p className="text-muted-foreground">
                Sign in to manage your contest entries, track your squares, and never miss a payout.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Create Your Account</CardTitle>
                <CardDescription>
                  Sign in with your Google, GitHub, or email to get started.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <a href="/api/login" data-testid="button-sign-in">
                  <Button size="lg" className="w-full gap-2">
                    <LogIn className="h-5 w-5" />
                    Sign In to Get Started
                  </Button>
                </a>
                <a href="/api/login/select-account" data-testid="button-sign-in-different">
                  <Button variant="outline" size="sm" className="w-full">
                    Use a Different Account
                  </Button>
                </a>
              </CardContent>
            </Card>

            <div className="mt-8 text-sm text-muted-foreground">
              <p>Already claimed squares? Sign in with the same email to see them all in one place.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Signed in - show dashboard
  const upcomingContests = contests.filter(c => new Date(c.eventDate) >= new Date());
  const pastContests = contests.filter(c => new Date(c.eventDate) < new Date());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold cursor-pointer" data-testid="link-home">South Bay Pools</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground" data-testid="text-user-email">
              {participant?.email}
            </span>
            <a href="/api/login/select-account" data-testid="button-switch-account">
              <Button variant="ghost" size="sm">
                Switch Account
              </Button>
            </a>
            <a href="/api/logout" data-testid="button-logout">
              <Button variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome{participant?.firstName ? `, ${participant.firstName}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            Manage your contest entries and track your squares.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-entries">
                {contests.reduce((sum, c) => sum + c.squareCount, 0)}
              </div>
              <p className="text-xs text-muted-foreground">squares across all contests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contests</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-contests">
                {upcomingContests.length}
              </div>
              <p className="text-xs text-muted-foreground">upcoming events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Browse Contests</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button variant="outline" className="w-full" data-testid="button-browse">
                  View All Contests
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-squares">
            <Link href="/">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Grid3X3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Football Squares</CardTitle>
                    <CardDescription>Pick squares on the 10x10 grid</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">View open contests</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-golf">
            <Link href="/golfsurvivor">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Golf Survivor</CardTitle>
                    <CardDescription>Pick one golfer each week to survive</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Learn more & join</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {contestsLoading ? (
          <p className="text-muted-foreground">Loading your contests...</p>
        ) : contests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Entries Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't joined any contests yet. Browse available contests to claim your squares!
              </p>
              <Link href="/">
                <Button data-testid="button-browse-empty">Browse Contests</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcomingContests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Upcoming Contests</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {upcomingContests.map((contest) => (
                    <ContestCard key={contest.contestId} contest={contest} />
                  ))}
                </div>
              </div>
            )}

            {pastContests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Past Contests</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {pastContests.map((contest) => (
                    <ContestCard key={contest.contestId} contest={contest} isPast />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ContestCard({ contest, isPast = false }: { contest: ParticipantContest; isPast?: boolean }) {
  const contestUrl = contest.contestSlug 
    ? `/${contest.contestSlug}` 
    : `/board/${contest.contestId}`;

  return (
    <Card className={isPast ? "opacity-75" : ""} data-testid={`card-contest-${contest.contestId}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{contest.contestName}</CardTitle>
            <CardDescription>
              {contest.topTeam} vs {contest.leftTeam}
            </CardDescription>
          </div>
          <Badge variant={isPast ? "secondary" : "default"}>
            {contest.squareCount} {contest.squareCount === 1 ? "square" : "squares"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 inline mr-1" />
            {format(new Date(contest.eventDate), "MMM d, yyyy")}
          </div>
          <Link href={contestUrl}>
            <Button variant="outline" size="sm" data-testid={`button-view-${contest.contestId}`}>
              View Board
            </Button>
          </Link>
        </div>
        {contest.squares.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Your squares:</p>
            <div className="flex flex-wrap gap-1">
              {contest.squares.slice(0, 10).map((s) => (
                <Badge key={s.index} variant="outline" className="text-xs">
                  #{s.index}
                </Badge>
              ))}
              {contest.squares.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{contest.squares.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
