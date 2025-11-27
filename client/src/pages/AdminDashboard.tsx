import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import ContestCard from "@/components/ContestCard";
import EmptyState from "@/components/EmptyState";
import { Grid3x3, Search, FolderPlus, Folder as FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Contest, Folder } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ContestWithCounts = Contest & {
  takenSquares: number;
  totalSquares: number;
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "locked">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"upcoming" | "recent">("upcoming");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const { data: contests = [], isLoading } = useQuery<ContestWithCounts[]>({
    queryKey: ["/api/contests"],
  });

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/folders", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Folder Created",
        description: "New folder has been created successfully.",
      });
      setNewFolderName("");
      setIsCreateFolderOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create folder",
        variant: "destructive",
      });
    },
  });

  const handleNewContest = () => {
    setLocation("/admin/contest/new");
  };

  const handleManage = (id: string) => {
    setLocation(`/admin/contest/${id}`);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim());
    }
  };

  // Filter and sort contests
  const filteredContests = contests
    .filter((contest) => {
      // Status filter
      if (statusFilter !== "all" && contest.status !== statusFilter) {
        return false;
      }
      // Folder filter
      if (folderFilter === "uncategorized") {
        if (contest.folderId) return false;
      } else if (folderFilter !== "all") {
        if (contest.folderId !== folderFilter) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          contest.name.toLowerCase().includes(query) ||
          contest.topTeam.toLowerCase().includes(query) ||
          contest.leftTeam.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.eventDate).getTime();
      const dateB = new Date(b.eventDate).getTime();
      return sortOrder === "upcoming" ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="min-h-screen bg-background">
      <TopNav
        title="SquareKeeper"
        actionLabel="New Contest"
        showAction={true}
        onAction={handleNewContest}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold">Contests</h2>
          <p className="text-muted-foreground mt-2">
            Manage your football squares pools
          </p>
        </div>

        {/* Folder Management */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-create-folder"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>
                    Create a folder to organize your contests.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="Folder name (e.g., 'Super Bowl 2025')"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                    }}
                    data-testid="input-folder-name"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateFolderOpen(false)}
                    data-testid="button-cancel-folder"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || createFolderMutation.isPending}
                    data-testid="button-submit-folder"
                  >
                    {createFolderMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {folders.length > 0 && (
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="w-48" data-testid="select-folder-filter">
                  <SelectValue placeholder="All Folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <FolderIcon className="h-4 w-4" />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              variant={statusFilter === "open" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("open")}
              data-testid="filter-open"
            >
              Open
            </Button>
            <Button
              variant={statusFilter === "locked" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("locked")}
              data-testid="filter-locked"
            >
              Locked
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "upcoming" ? "recent" : "upcoming")}
              data-testid="button-sort"
            >
              {sortOrder === "upcoming" ? "Upcoming First" : "Recent First"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading contests...</p>
          </div>
        ) : filteredContests.length === 0 && contests.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-2">No contests match your filters</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        ) : contests.length === 0 ? (
          <EmptyState
            icon={Grid3x3}
            title="No contests yet — create your first one."
            description="Start managing your football squares pools by creating a new contest."
            actionLabel="New Contest"
            onAction={handleNewContest}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContests.map((contest) => (
              <ContestCard
                key={contest.id}
                id={contest.id}
                name={contest.name}
                eventDate={new Date(contest.eventDate)}
                status={contest.status as "open" | "locked"}
                topTeam={contest.topTeam}
                leftTeam={contest.leftTeam}
                takenSquares={contest.takenSquares}
                totalSquares={contest.totalSquares}
                onManage={handleManage}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
