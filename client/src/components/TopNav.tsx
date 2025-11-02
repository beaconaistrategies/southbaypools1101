import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

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
        <Link href="/admin">
          <h1 className="text-xl font-bold hover-elevate cursor-pointer px-2 py-1 rounded-md transition-colors" data-testid="text-app-title">{title}</h1>
        </Link>
        <div className="flex items-center gap-4">
          {showAction && actionLabel && (
            <Button onClick={onAction} data-testid="button-primary-action">
              {actionLabel}
            </Button>
          )}
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground" data-testid="text-user-email">
                {user.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
