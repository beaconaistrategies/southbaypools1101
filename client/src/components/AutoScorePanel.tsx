import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Trash2, RefreshCw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Contest, LinkedGame } from "@shared/schema";

interface GameScore {
  espnGameId: string;
  homeTeam: { name: string; abbreviation: string; score: number };
  awayTeam: { name: string; abbreviation: string; score: number };
  status: "scheduled" | "in_progress" | "final";
  period: number;
  periodScores: { home: number[]; away: number[] };
  clock?: string;
  startTime?: string;
}

interface AutoScorePanelProps {
  contest: Contest;
}

function getStatusColor(status: string) {
  switch (status) {
    case "final": return "bg-green-100 text-green-800";
    case "in_progress": return "bg-yellow-100 text-yellow-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "final": return "Final";
    case "in_progress": return "Live";
    case "scheduled": return "Scheduled";
    default: return status;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AutoScorePanel({ contest }: AutoScorePanelProps) {
  const { toast } = useToast();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [sport, setSport] = useState<"nfl" | "ncaa_bb">("ncaa_bb");
  const [searchDate, setSearchDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [searchResults, setSearchResults] = useState<GameScore[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const linkedGames: LinkedGame[] = (contest.linkedGames as LinkedGame[]) || [];
  const autoScoreEnabled = contest.autoScoreEnabled ?? false;

  // Toggle auto-score
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const action = enabled ? "enable" : "disable";
      return await apiRequest("POST", `/api/contests/${contest.id}/auto-score/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contest.id] });
      toast({ title: autoScoreEnabled ? "Auto-score disabled" : "Auto-score enabled" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Link game
  const linkGameMutation = useMutation({
    mutationFn: async (game: GameScore) => {
      return await apiRequest("POST", `/api/contests/${contest.id}/link-game`, {
        espnGameId: game.espnGameId,
        sport,
        layerIndex: 0,
        topTeamIsHome: sport === "nfl",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contest.id] });
      toast({ title: "Game linked" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Unlink game
  const unlinkGameMutation = useMutation({
    mutationFn: async (gameNumber: number) => {
      return await apiRequest("DELETE", `/api/contests/${contest.id}/link-game/${gameNumber}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contest.id] });
      toast({ title: "Game unlinked" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Trigger auto-score manually
  const triggerMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/cron/auto-score");
    },
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/contests", contest.id] });
      toast({
        title: "Auto-score ran",
        description: `Processed ${result.processed} contest(s), updated ${result.updated}`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Search ESPN games
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const dateFormatted = searchDate.replace(/-/g, "");
      const response = await apiRequest("GET", `/api/sports/games?sport=${sport}&date=${dateFormatted}`);
      const games: GameScore[] = await response.json();
      setSearchResults(games);
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkGame = (game: GameScore) => {
    linkGameMutation.mutate(game, {
      onSuccess: () => {
        // Don't close dialog for NCAA BB — user may want to link multiple games
        if (sport === "nfl") {
          setShowLinkDialog(false);
        }
        setSearchResults((prev) =>
          prev.filter((g) => g.espnGameId !== game.espnGameId)
        );
      },
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Auto-Score</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically update winners from live ESPN scores.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="auto-score-toggle" className="text-sm">
            {autoScoreEnabled ? "Enabled" : "Disabled"}
          </Label>
          <Switch
            id="auto-score-toggle"
            checked={autoScoreEnabled}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
            disabled={toggleMutation.isPending}
          />
        </div>
      </div>

      {/* Linked Games List */}
      {linkedGames.length > 0 ? (
        <div className="space-y-3 mb-4">
          <Label className="text-sm text-muted-foreground">Linked Games</Label>
          {linkedGames.map((lg) => (
            <div
              key={`${lg.espnGameId}-${lg.gameNumber}`}
              className="flex items-center justify-between p-3 bg-muted rounded-md"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-xs">
                  GM{lg.gameNumber}
                </Badge>
                <div>
                  <div className="font-medium text-sm">
                    {lg.awayTeam} @ {lg.homeTeam}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lg.sport === "nfl" ? "NFL" : "NCAA BB"} — {formatDate(lg.gameDate)}
                    {lg.finalScore && (
                      <span className="ml-2">
                        W: {lg.finalScore.winner} - L: {lg.finalScore.loser}
                      </span>
                    )}
                    {lg.lastScores && !lg.finalScore && (
                      <span className="ml-2">
                        {lg.lastScores.away.reduce((a, b) => a + b, 0)} - {lg.lastScores.home.reduce((a, b) => a + b, 0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(lg.status)}>
                  {getStatusLabel(lg.status)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unlinkGameMutation.mutate(lg.gameNumber)}
                  disabled={unlinkGameMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 mb-4">
          <p className="text-muted-foreground text-sm">
            No games linked yet. Link ESPN games to automatically update winners.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setShowLinkDialog(true)}>
          <Search className="h-4 w-4 mr-2" />
          Link Game
        </Button>
        {linkedGames.length > 0 && (
          <Button
            variant="outline"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerMutation.isPending ? "animate-spin" : ""}`} />
            {triggerMutation.isPending ? "Scoring..." : "Score Now"}
          </Button>
        )}
      </div>

      {/* Link Game Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link ESPN Game</DialogTitle>
            <DialogDescription>
              Search for a game to link to this contest. {sport === "ncaa_bb" && "You can link multiple games."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Sport & Date Selection */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-sm mb-1.5 block">Sport</Label>
                <Select value={sport} onValueChange={(v) => setSport(v as "nfl" | "ncaa_bb")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ncaa_bb">NCAA Basketball</SelectItem>
                    <SelectItem value="nfl">NFL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-sm mb-1.5 block">Date</Label>
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleSearch} disabled={isSearching} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {isSearching ? "Searching..." : "Search Games"}
            </Button>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                <Label className="text-sm text-muted-foreground">
                  {searchResults.length} game(s) found
                </Label>
                {searchResults.map((game) => {
                  const alreadyLinked = linkedGames.some(
                    (lg) => lg.espnGameId === game.espnGameId,
                  );
                  return (
                    <div
                      key={game.espnGameId}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {game.awayTeam.name} @ {game.homeTeam.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Badge className={`${getStatusColor(game.status)} text-xs`}>
                            {getStatusLabel(game.status)}
                          </Badge>
                          {game.status !== "scheduled" && (
                            <span>
                              {game.awayTeam.score} - {game.homeTeam.score}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyLinked ? "outline" : "default"}
                        disabled={alreadyLinked || linkGameMutation.isPending}
                        onClick={() => handleLinkGame(game)}
                      >
                        {alreadyLinked ? "Linked" : "Link"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {searchResults.length === 0 && isSearching === false && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Search for games by selecting a sport and date above.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
