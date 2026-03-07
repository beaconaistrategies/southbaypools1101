import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy } from "lucide-react";

export default function NewEarningsPool() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [tournamentName, setTournamentName] = useState("");
  const [season, setSeason] = useState(new Date().getFullYear());
  const [slug, setSlug] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [maxEntries, setMaxEntries] = useState(1);
  const [purseDollars, setPurseDollars] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/earnings-pools", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tournamentName,
          season,
          slug: slug || undefined,
          entryFee: entryFee || undefined,
          maxEntriesPerEmail: maxEntries,
          purseTotalCents: purseDollars ? Math.round(Number(purseDollars) * 100) : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create pool");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Pool created!", description: "Now import the field from DataGolf." });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings-pools"] });
      setLocation(`/admin/golf/earnings/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/golf")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          New Earnings Pool
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pool Details</CardTitle>
          <CardDescription>
            Create a tiered golf earnings pool. After creating, you'll import the tournament field from DataGolf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Pool Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Masters Earnings Pool 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="tournament">Tournament Name *</Label>
            <Input
              id="tournament"
              placeholder="e.g. The Masters"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be auto-updated when you import the field from DataGolf.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="season">Season *</Label>
              <Input
                id="season"
                type="number"
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="entryFee">Entry Fee</Label>
              <Input
                id="entryFee"
                placeholder="e.g. $50"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxEntries">Max Entries Per Email</Label>
              <Input
                id="maxEntries"
                type="number"
                min={1}
                max={10}
                value={maxEntries}
                onChange={(e) => setMaxEntries(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="purse">Tournament Purse (USD)</Label>
              <Input
                id="purse"
                type="number"
                placeholder="e.g. 20000000"
                value={purseDollars}
                onChange={(e) => setPurseDollars(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="slug">Custom URL Slug</Label>
            <Input
              id="slug"
              placeholder="e.g. masters-2026"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Pool rules, payout info, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            disabled={!name || !tournamentName || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creating..." : "Create Pool"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
