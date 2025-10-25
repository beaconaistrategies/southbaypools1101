import { useLocation } from "wouter";
import TopNav from "@/components/TopNav";
import ContestForm from "@/components/ContestForm";
import { useToast } from "@/hooks/use-toast";

export default function NewContest() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = (data: any) => {
    console.log("Contest created:", data);
    toast({
      title: "Saved",
      description: "Contest has been created successfully.",
    });
    setTimeout(() => setLocation("/admin"), 500);
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
