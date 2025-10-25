import { Button } from "@/components/ui/button";

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
        <h1 className="text-xl font-bold" data-testid="text-app-title">{title}</h1>
        {showAction && actionLabel && (
          <Button onClick={onAction} data-testid="button-primary-action">
            {actionLabel}
          </Button>
        )}
      </div>
    </header>
  );
}
