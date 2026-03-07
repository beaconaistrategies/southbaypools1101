import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Grid3X3, Calendar, Users, LogIn, LogOut, LayoutDashboard, Trophy, ArrowRight, Medal } from "lucide-react";
import { format } from "date-fns";
import { isUnauthorizedError } from "@/lib/authUtils";

type PublicContest = {
  id: string;
  name: string;
  slug: string | null;
  eventDate: string;
  topTeam: string;
  leftTeam: string;
  takenSquares: number;
  availableSquares: number;
  totalSquares: number;
  operatorSlug: string | null;
};

type Participant = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export default function Hub() {
  const { data: contests = [], isLoading } = useQuery<PublicContest[]>({
    queryKey: ["/api/public/contests"],
  });

  const { data: participant, error: authError } = useQuery<Participant>({
    queryKey: ["/api/participant/user"],
    retry: false,
  });

  const isAuthenticated = !!participant && !authError;

  const upcomingContests = contests.filter(c => new Date(c.eventDate) >= new Date());
  const fillingUp = upcomingContests.filter(c => c.availableSquares < 50 && c.availableSquares > 0);
  const openContests = upcomingContests.filter(c => c.availableSquares >= 50);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">South Bay Pools</span>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground" data-testid="text-user-email">
                  {participant.email}
                </span>
                <Link href="/join">
                  <Button variant="outline" className="gap-2" data-testid="button-dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    My Dashboard
                  </Button>
                </Link>
                <a href="/api/logout" data-testid="button-logout">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </a>
              </>
            ) : (
              <Link href="/join">
                <Button variant="outline" className="gap-2" data-testid="button-join">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to South Bay Pools</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our football squares, survivor pools, and golf majors. Pick your squares, track your entries, and compete for prizes!
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/join">
              <Button size="lg" className="gap-2" data-testid="button-get-started">
                <Users className="h-5 w-5" />
                Get Started
              </Button>
            </Link>
            <Link href="/golfsurvivor">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-golf-survivor">
                <Trophy className="h-5 w-5" />
                Golf Survivor
              </Button>
            </Link>
            <Link href="/golf-majors">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-golf-majors">
                <Medal className="h-5 w-5" />
                Golf Majors
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto mb-12">
          <a
            href="#contests"
            className="block"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("contests")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Card className="hover-elevate cursor-pointer" data-testid="card-squares-type">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Grid3X3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Football Squares</CardTitle>
                    <CardDescription>10x10 grid pools for game days</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {contests.length} active contest{contests.length !== 1 ? "s" : ""}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </a>

          <Card className="hover-elevate cursor-pointer" data-testid="card-golf-type">
            <Link href="/golfsurvivor">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Golf Survivor</CardTitle>
                    <CardDescription>Pick golfers, make the cut, survive</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Season 2026</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover-elevate cursor-pointer" data-testid="card-golf-majors-type">
            <Link href="/golf-majors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Medal className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Golf Majors</CardTitle>
                    <CardDescription>Tiered picks, real earnings</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Season 2026</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading contests...</p>
          </div>
        ) : contests.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Contests</h3>
              <p className="text-muted-foreground">
                Check back soon for new contests!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {fillingUp.length > 0 && (
              <div id="contests" className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-semibold">Filling Up Fast</h2>
                  <Badge variant="destructive">Limited spots!</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {fillingUp.map((contest) => (
                    <ContestCard key={contest.id} contest={contest} highlight />
                  ))}
                </div>
              </div>
            )}

            {openContests.length > 0 && (
              <div id={fillingUp.length === 0 ? "contests" : undefined} className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Open Contests</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {openContests.map((contest) => (
                    <ContestCard key={contest.id} contest={contest} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-12 text-center border-t pt-8">
          <h3 className="text-lg font-medium mb-2">Already have entries?</h3>
          <p className="text-muted-foreground mb-4">
            Sign in to see all your squares in one place.
          </p>
          <Link href="/join">
            <Button variant="outline" data-testid="button-sign-in-footer">
              Sign In to Your Account
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

function ContestCard({ contest, highlight = false }: { contest: PublicContest; highlight?: boolean }) {
  const fillPercentage = ((contest.takenSquares) / contest.totalSquares) * 100;
  
  // Build contest URL based on operator
  const isPrimaryOperator = contest.operatorSlug === "south-bay-pools";
  const contestUrl = contest.slug 
    ? (isPrimaryOperator ? `/${contest.slug}` : `/${contest.operatorSlug}/${contest.slug}`)
    : `/board/${contest.id}`;

  return (
    <Card 
      className={highlight ? "border-2 border-primary" : ""} 
      data-testid={`card-contest-${contest.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{contest.name}</CardTitle>
            <CardDescription>
              {contest.topTeam} vs {contest.leftTeam}
            </CardDescription>
          </div>
          {contest.availableSquares === 0 ? (
            <Badge variant="secondary">Sold Out</Badge>
          ) : contest.availableSquares < 20 ? (
            <Badge variant="destructive">{contest.availableSquares} left!</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            {format(new Date(contest.eventDate), "EEEE, MMMM d, yyyy")}
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>{contest.takenSquares} claimed</span>
              <span>{contest.availableSquares} available</span>
            </div>
            <Progress value={fillPercentage} className="h-2" />
          </div>

          <Link href={contestUrl}>
            <Button 
              className="w-full" 
              variant={contest.availableSquares === 0 ? "outline" : "default"}
              data-testid={`button-view-${contest.id}`}
            >
              {contest.availableSquares === 0 ? "View Board" : "Claim Your Squares"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
