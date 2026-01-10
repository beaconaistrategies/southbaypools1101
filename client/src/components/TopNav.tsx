import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Users, ChevronDown, Grid3X3, Trophy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopNavProps {
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  showAction?: boolean;
}

export default function TopNav({ 
  title = "SquareKeeper", 
  actionLabel, 
  onAction,
  showAction = false 
}: TopNavProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/admin">
            <h1 className="text-xl font-bold hover-elevate cursor-pointer px-2 py-1 rounded-md transition-colors" data-testid="text-app-title">{title}</h1>
          </Link>
          {user && (
            <nav className="flex items-center gap-1">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="nav-football">
                  <Grid3X3 className="h-4 w-4" />
                  Football Squares
                </Button>
              </Link>
              <Link href="/admin/golf">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="nav-golf">
                  <Trophy className="h-4 w-4" />
                  Golf Survivor
                </Button>
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          {showAction && actionLabel && (
            <Button onClick={onAction} data-testid="button-primary-action">
              {actionLabel}
            </Button>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-user-menu">
                  <span className="text-sm">{user.email}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href="/admin/users">
                  <DropdownMenuItem className="cursor-pointer" data-testid="menu-item-users">
                    <Users className="h-4 w-4 mr-2" />
                    User Management
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive"
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="menu-item-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
