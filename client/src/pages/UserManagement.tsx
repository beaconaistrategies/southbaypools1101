import { useQuery, useMutation } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { User, UserRole } from "@shared/schema";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
  { value: "trial", label: "Trial" },
];

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  manager: "bg-green-500/20 text-green-400 border-green-500/30",
  member: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  trial: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export default function UserManagement() {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, role: UserRole) => {
    updateRoleMutation.mutate({ userId, role });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="SquareKeeper" />
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">User Management</h1>
            <p className="text-muted-foreground">Manage user roles and permissions</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  const userRole = (user.role || "member") as UserRole;
                  
                  return (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium" data-testid={`text-email-${user.id}`}>
                        {user.email}
                        {isCurrentUser && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-name-${user.id}`}>
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.firstName || "—"}
                      </TableCell>
                      <TableCell>
                        {isCurrentUser ? (
                          <Badge className={ROLE_COLORS[userRole]} data-testid={`badge-role-${user.id}`}>
                            {ROLE_OPTIONS.find(r => r.value === userRole)?.label || userRole}
                          </Badge>
                        ) : (
                          <Select
                            value={userRole}
                            onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger 
                              className="w-36" 
                              data-testid={`select-role-${user.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((option) => {
                                const canAssign = option.value !== "super_admin" || isSuperAdmin;
                                return (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    disabled={!canAssign}
                                    data-testid={`option-role-${option.value}`}
                                  >
                                    {option.label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.updatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Role Permissions</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>Super Admin:</strong> Full platform access, can manage all operators and assign super admin role</li>
            <li><strong>Admin:</strong> Full control within your organization (users, contests, settings)</li>
            <li><strong>Manager:</strong> Can manage specific assigned contests only</li>
            <li><strong>Member:</strong> Standard authenticated participant access</li>
            <li><strong>Trial:</strong> Limited access with restrictions</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
