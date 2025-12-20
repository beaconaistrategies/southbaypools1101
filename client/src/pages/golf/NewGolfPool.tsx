import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import TopNav from "@/components/TopNav";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Pool name is required").max(100, "Name must be 100 characters or less"),
  slug: z.union([
    z.string()
      .max(100, "URL slug must be 100 characters or less")
      .regex(/^[a-z0-9-]+$/, "URL slug can only contain lowercase letters, numbers, and hyphens"),
    z.literal(''),
  ]).optional(),
  season: z.number().min(2020).max(2100),
  entryFee: z.string().optional(),
  prizePool: z.string().optional(),
  pickDeadlineHours: z.number().min(0).max(72).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewGolfPool() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      season: new Date().getFullYear(),
      entryFee: "",
      prizePool: "",
      pickDeadlineHours: 0,
      notes: "",
    },
  });

  const createPoolMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/golf/pools", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/golf/pools"] });
      toast({
        title: "Pool Created",
        description: "Your Golf Survivor pool has been created successfully.",
      });
      setLocation("/admin/golf");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create pool",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    createPoolMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="Golf Survivor" />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/golf")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-semibold">New Golf Survivor Pool</h2>
          <p className="text-muted-foreground mt-2">
            Create a new survivor-style pool for the PGA Tour season
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pool Settings</CardTitle>
            <CardDescription>
              Configure your pool's basic settings and rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pool Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 2025 PGA Survivor Pool"
                          {...field}
                          data-testid="input-pool-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., pga-survivor-2025"
                          {...field}
                          data-testid="input-pool-slug"
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank to use a random ID. Only lowercase letters, numbers, and hyphens.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="season"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Season</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-season">
                            <SelectValue placeholder="Select season" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="entryFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entry Fee (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., $50"
                            {...field}
                            data-testid="input-entry-fee"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prizePool"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prize Pool (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., $500"
                            {...field}
                            data-testid="input-prize-pool"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="pickDeadlineHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pick Deadline</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-deadline">
                            <SelectValue placeholder="Select deadline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">At tournament start</SelectItem>
                          <SelectItem value="1">1 hour before</SelectItem>
                          <SelectItem value="2">2 hours before</SelectItem>
                          <SelectItem value="6">6 hours before</SelectItem>
                          <SelectItem value="12">12 hours before</SelectItem>
                          <SelectItem value="24">24 hours before</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        When picks are due relative to tournament start
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional rules or information for participants..."
                          className="resize-none"
                          {...field}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/admin/golf")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPoolMutation.isPending}
                    data-testid="button-create-pool"
                  >
                    {createPoolMutation.isPending ? "Creating..." : "Create Pool"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
