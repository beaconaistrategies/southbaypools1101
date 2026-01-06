import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { hasRolePermission, type UserRole, ROLE_HIERARCHY } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const userRole = (user?.role as UserRole) ?? "member";
  
  // Role permission helpers
  const isSuperAdmin = userRole === "super_admin";
  const isAdminOrAbove = hasRolePermission(userRole, "admin") || user?.isAdmin;
  const isManagerOrAbove = hasRolePermission(userRole, "manager");
  const isMemberOrAbove = hasRolePermission(userRole, "member");
  const isTrial = userRole === "trial";

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
    // Role info
    role: userRole,
    // Permission helpers
    isSuperAdmin,
    isAdmin: isAdminOrAbove ?? false, // Backwards compatible
    isAdminOrAbove: isAdminOrAbove ?? false,
    isManagerOrAbove,
    isMemberOrAbove,
    isTrial,
    // Helper to check if user has a specific role or higher
    hasRole: (requiredRole: UserRole) => hasRolePermission(userRole, requiredRole),
  };
}
