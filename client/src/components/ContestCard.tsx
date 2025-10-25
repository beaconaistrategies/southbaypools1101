import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { format } from "date-fns";
import { Calendar, Users } from "lucide-react";

interface ContestCardProps {
  id: string;
  name: string;
  eventDate: Date;
  status: "open" | "locked";
  topTeam: string;
  leftTeam: string;
  takenSquares: number;
  totalSquares: number;
  onManage?: (id: string) => void;
  onViewPublic?: (id: string) => void;
}

export default function ContestCard({
  id,
  name,
  eventDate,
  status,
  topTeam,
  leftTeam,
  takenSquares,
  totalSquares,
  onManage,
  onViewPublic
}: ContestCardProps) {
  const percentTaken = (takenSquares / totalSquares) * 100;
  
  return (
    <Card className="p-6 hover-elevate" data-testid={`card-contest-${id}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate" data-testid="text-contest-name">
              {name}
            </h3>
          </div>
          <StatusBadge status={status} />
        </div>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{topTeam} vs {leftTeam}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(eventDate, 'MMM d, yyyy')}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Squares Taken</span>
            <span className="font-medium" data-testid="text-squares-taken">
              {takenSquares} / {totalSquares}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percentTaken}%` }}
            />
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onManage?.(id)}
            data-testid="button-manage"
          >
            Manage
          </Button>
          <Button 
            variant="secondary" 
            className="flex-1"
            onClick={() => onViewPublic?.(id)}
            data-testid="button-view-public"
          >
            Public Board
          </Button>
        </div>
      </div>
    </Card>
  );
}
