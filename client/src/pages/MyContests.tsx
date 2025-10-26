import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Calendar, Users, ExternalLink, Search } from "lucide-react";
import { format } from "date-fns";
import TopNav from "@/components/TopNav";

interface ContestParticipation {
  contestId: string;
  contestName: string;
  eventDate: Date;
  topTeam: string;
  leftTeam: string;
  squareNumber: number;
  entryName: string;
}

export default function MyContests() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");

  const { data: participations = [], isLoading } = useQuery<ContestParticipation[]>({
    queryKey: ["/api/my-contests", searchEmail],
    enabled: !!searchEmail,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchEmail(email.trim().toLowerCase());
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="SquareKeeper" />
      
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold mb-2">My Contests</h2>
          <p className="text-muted-foreground">
            Enter your email to see all the contests you've participated in
          </p>
        </div>

        <Card className="p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                data-testid="input-email"
              />
            </div>
            <Button type="submit" className="w-full" data-testid="button-search">
              <Search className="h-4 w-4 mr-2" />
              Find My Contests
            </Button>
          </form>
        </Card>

        {isLoading && (
          <div className="text-center text-muted-foreground py-8">
            Searching for your contests...
          </div>
        )}

        {!isLoading && searchEmail && participations.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No contests found for <span className="font-medium">{searchEmail}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure you're using the same email you used to claim squares
            </p>
          </Card>
        )}

        {participations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Found {participations.length} contest{participations.length !== 1 ? 's' : ''}
            </h3>
            
            {participations.map((participation) => (
              <Card 
                key={`${participation.contestId}-${participation.squareNumber}`} 
                className="p-6 hover-elevate"
                data-testid={`card-participation-${participation.contestId}`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold truncate">
                      {participation.contestName}
                    </h4>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{participation.topTeam} vs {participation.leftTeam}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(participation.eventDate), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Entry</p>
                    <p className="font-medium">{participation.entryName}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Square #{participation.squareNumber}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    asChild
                    data-testid={`button-view-board-${participation.contestId}`}
                  >
                    <a 
                      href={`/board/${participation.contestId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      View Board
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
