import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trophy, Users, Calendar, Target, Clock, Ban, Zap, Crown } from "lucide-react";

export default function GolfSurvivor() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold cursor-pointer">South Bay Pools</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/join">
              <Button variant="outline" data-testid="button-sign-in">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-16 md:py-24 bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 dark:to-background">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Trophy className="h-4 w-4" />
              PGA Tour Season 2025
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              South Bay Golf Survivor
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Pick one golfer each week. If they make the cut, you survive. 
              Use each golfer only once. Last one standing wins!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/join">
                <Button size="lg" className="gap-2" data-testid="button-join-now">
                  <Users className="h-5 w-5" />
                  Join the Pool
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="gap-2" data-testid="button-learn-more">
                  Learn How It Works
                </Button>
              </a>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Simple rules, maximum excitement. Here's everything you need to know.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="text-center" data-testid="card-step-1">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">1. Pick a Golfer</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Each week, select one PGA Tour golfer from the tournament field. 
                    Choose wisely based on their form and the course.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center" data-testid="card-step-2">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">2. Make the Cut</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    If your golfer makes the cut (plays all 4 rounds), you advance 
                    to the next week. Miss the cut and you're eliminated.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center" data-testid="card-step-3">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Ban className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">3. No Repeats</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Once you use a golfer, they're locked for the rest of the season. 
                    Strategy matters—save the top players for tough courses!
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center" data-testid="card-step-4">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">4. Last One Wins</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Survive the longest to win! If everyone gets eliminated in the 
                    same week, the pot carries over or splits among survivors.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Pool Rules</h2>
                <p className="text-muted-foreground">
                  Everything you need to know about playing in our survivor pool.
                </p>
              </div>

              <div className="space-y-6">
                <Card data-testid="card-rule-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        1
                      </div>
                      <CardTitle className="text-lg">One Pick Per Week</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Submit your pick before the tournament's first round begins (typically Thursday morning). 
                      Late picks will not be accepted—no exceptions.
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-rule-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        2
                      </div>
                      <CardTitle className="text-lg">No Repeat Golfers</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Each golfer can only be used once per season. Once you pick Scottie Scheffler, 
                      he's off your board forever. Plan your selections strategically!
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-rule-3">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        3
                      </div>
                      <CardTitle className="text-lg">Auto-Pick If You Forget</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Forgot to make a pick? The system will auto-select the highest-ranked available 
                      golfer from your remaining options. But it's always better to choose yourself!
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-rule-4">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        4
                      </div>
                      <CardTitle className="text-lg">Winning Conditions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      The last surviving entry wins the pot. If multiple entries are eliminated 
                      in the same week and no one remains, the prize pool is split equally among 
                      them (or rolls into the next season).
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
            <p className="text-lg opacity-90 max-w-xl mx-auto mb-8">
              Join the South Bay Golf Survivor pool and compete against friends for 
              bragging rights and cash prizes!
            </p>
            <Link href="/join">
              <Button size="lg" variant="secondary" className="gap-2" data-testid="button-join-footer">
                <Zap className="h-5 w-5" />
                Join Now
              </Button>
            </Link>
          </div>
        </section>

        <footer className="py-8 border-t">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} South Bay Pools. All rights reserved.</p>
            <div className="mt-2 flex justify-center gap-4">
              <Link href="/">
                <span className="hover:text-foreground cursor-pointer">Home</span>
              </Link>
              <Link href="/join">
                <span className="hover:text-foreground cursor-pointer">Join</span>
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
