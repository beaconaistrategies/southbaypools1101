import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "open" | "locked";
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const isOpen = status === "open";
  
  return (
    <Badge 
      variant={isOpen ? "default" : "destructive"}
      className="rounded-full text-xs font-medium uppercase tracking-wide"
      data-testid={`badge-status-${status}`}
    >
      {isOpen ? "Open" : "Locked"}
    </Badge>
  );
}
