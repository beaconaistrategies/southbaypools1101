import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import ContestForm from "@/components/ContestForm";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function NewContest() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const createContestMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/contests", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({
        title: "Saved",
        description: "Contest has been created successfully.",
      });
      setTimeout(() => setLocation("/admin"), 500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contest",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    createContestMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation("/admin");
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="SquareKeeper" />
      
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold">New Contest</h2>
          <p className="text-muted-foreground mt-2">
            Create a new football squares pool
          </p>
        </div>

        <ContestForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </main>
    </div>
  );
}
