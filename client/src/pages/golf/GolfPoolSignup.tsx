import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, Users, DollarSign, Calendar, Check, LogIn, Mail, LogOut, Info, BarChart3, Flag, Plus } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { GolfPoolEntry } from "@shared/schema";

type GolfPoolPublic = {
  id: string;
  name: string;
  slug: string | null;
  season: number;
  entryFee: string | null;
  currentWeek: number;
  entryCount: number;
  status: string;
};

type Participant = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

function useParticipantAuth() {
  const { data: participant, isLoading, error } = useQuery<Participant>({
    queryKey: ["/api/participant/user"],
    retry: false,
  });

  const isAuthenticated = !!participant && !error;
  return { participant, isLoading, isAuthenticated };
}

export default function GolfPoolSignup() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const poolId = params.poolId || "";
  const { toast } = useToast();
  const { participant, isLoading: authLoading, isAuthenticated } = useParticipantAuth();
  const [entryName, setEntryName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const { data: pool, isLoading: poolLoading, error: poolError } = useQuery<GolfPoolPublic>({
    queryKey: ["/api/public/golf/pools", poolId],
    queryFn: async () => {
      const response = await fetch(`/api/public/golf/pools/${poolId}`);
      if (!response.ok) throw new Error("Pool not found");
      return response.json();
    },
  });

  const { data: myEntries = [] } = useQuery<GolfPoolEntry[]>({
    queryKey: ["/api/golf/pools", poolId, "entries/email", participant?.email],
    queryFn: async () => {
      if (!participant?.email) return [];
      const response = await fetch(`/api/golf/pools/${poolId}/entries/email/${encodeURIComponent(participant.email)}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!participant?.email && !!poolId,
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { entryName: string }): Promise<GolfPoolEntry> => {
      const response = await apiRequest("POST", `/api/participant/golf/pools/${poolId}/signup`, data);
      return response.json();
    },
    onSuccess: (data: GolfPoolEntry) => {
      queryClient.invalidateQueries({ queryKey: ["/api/participant/golf/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/golf/pools", poolId, "entries/email", participant?.email] });
      toast({ title: "Entry Created!", description: "You've successfully joined the pool." });
      setEntryName("");
      setLocation(`/golf/pool/${poolId}/entry/${data.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (entryName.trim()) {
      signupMutation.mutate({ entryName: entryName.trim() });
    }
  };

  if (poolLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (poolError || !pool) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Pool Not Found</h1>
          <p className="text-muted-foreground mb-6">This pool doesn't exist or is no longer available.</p>
          <Link href="/golfsurvivor">
            <Button>Back to Golf Survivor</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/">
            <span className="text-xl font-bold cursor-pointer" data-testid="link-home">South Bay Pools</span>
          </Link>
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground" data-testid="text-user-email">
                Signed in as {participant?.email}
              </span>
              <a href="/api/logout" data-testid="button-sign-out">
                <Button variant="ghost" size="sm" className="gap-1">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </a>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Link href="/golfsurvivor">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Golf Survivor
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">{pool.name}</CardTitle>
            <CardDescription>
              {pool.season} PGA Tour Season
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              <div>
                <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{pool.entryCount}</p>
                <p className="text-xs text-muted-foreground">Entries</p>
              </div>
              <div>
                <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{pool.entryFee ? `$${pool.entryFee}` : "Free"}</p>
                <p className="text-xs text-muted-foreground">Entry Fee</p>
              </div>
              <div>
                <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">Week {pool.currentWeek}</p>
                <p className="text-xs text-muted-foreground">Current</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Link href={`/golf/pool/${poolId}/leaderboard`} className="flex-1">
                <Button variant="outline" className="w-full gap-2" data-testid="button-view-leaderboard">
                  <BarChart3 className="h-4 w-4" />
                  View Leaderboard
                </Button>
              </Link>
            </div>

            {pool.status === "completed" ? (
              <div className="text-center py-4">
                <Badge variant="secondary" className="mb-2">Registration Closed</Badge>
                <p className="text-sm text-muted-foreground">This pool is no longer accepting new entries.</p>
              </div>
            ) : !isAuthenticated ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-muted-foreground">Sign in with Google, GitHub, Apple, or any email to join</p>
                <div className="flex items-center gap-2 justify-center">
                  <Checkbox
                    id="remember-me-golf"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    data-testid="checkbox-remember-me"
                  />
                  <Label htmlFor="remember-me-golf" className="text-sm cursor-pointer">
                    Stay signed in for 30 days
                  </Label>
                </div>
                <a href={`/api/login?remember=${rememberMe}&returnTo=${encodeURIComponent(window.location.pathname)}`} data-testid="button-sign-in">
                  <Button size="lg" className="w-full gap-2">
                    <LogIn className="h-5 w-5" />
                    Sign In to Join
                  </Button>
                </a>
                <a href={`/api/login/select-account?remember=${rememberMe}&returnTo=${encodeURIComponent(window.location.pathname)}`} className="block">
                  <Button variant="ghost" size="sm" className="w-full">
                    Use a Different Account
                  </Button>
                </a>
                <div className="text-xs text-muted-foreground pt-3 border-t space-y-2">
                  <p>
                    <Mail className="h-3 w-3 inline mr-1" />
                    Non-Google emails get a magic link - no password needed!
                  </p>
                  <div className="flex items-start gap-2 bg-muted/50 rounded-md p-2">
                    <Info className="h-3 w-3 mt-0.5 shrink-0 text-blue-500" />
                    <p className="text-left">
                      Look for a confirmation email from <strong>Replit</strong> (not South Bay Pools) in your inbox.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {myEntries.length > 0 && (
                  <div className="space-y-3">
                    <Label>Your Entries</Label>
                    {myEntries.map((entry) => (
                      <Link key={entry.id} href={`/golf/pool/${poolId}/entry/${entry.id}`}>
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover-elevate" data-testid={`entry-${entry.id}`}>
                          <div className="flex items-center gap-3">
                            <Flag className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{entry.entryName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.status === "active" ? (
                              <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Eliminated</Badge>
                            )}
                            <Button variant="ghost" size="sm">
                              Manage Picks
                            </Button>
                          </div>
                        </div>
                      </Link>
                    ))}
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm text-muted-foreground mb-3">Add another entry to this pool:</p>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="entryName">{myEntries.length > 0 ? "New Entry Name" : "Your Entry Name"}</Label>
                    <Input
                      id="entryName"
                      value={entryName}
                      onChange={(e) => setEntryName(e.target.value)}
                      placeholder="e.g., John's Pick, Lucky 7"
                      data-testid="input-entry-name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is how your entry will appear on the leaderboard
                    </p>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2"
                    disabled={!entryName.trim() || signupMutation.isPending}
                    data-testid="button-signup"
                  >
                    {signupMutation.isPending ? (
                      "Creating Entry..."
                    ) : (
                      <>
                        {myEntries.length > 0 ? <Plus className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                        {myEntries.length > 0 ? "Add Another Entry" : "Join Pool"}
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p>Pick one golfer each week who you think will make the cut</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p>If your golfer makes the cut, you survive to the next week</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p>You can only use each golfer once per season</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
              <p>Last one standing wins the pot!</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
