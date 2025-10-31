import { Button } from "@/components/ui/button";
import { Link } from "wouter";

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
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/admin">
          <h1 className="text-xl font-bold hover-elevate cursor-pointer px-2 py-1 rounded-md transition-colors" data-testid="text-app-title">{title}</h1>
        </Link>
        {showAction && actionLabel && (
          <Button onClick={onAction} data-testid="button-primary-action">
            {actionLabel}
          </Button>
        )}
      </div>
    </header>
  );
}
