import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Tag } from "lucide-react";

interface SquareDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  square: {
    index: number;
    entryName?: string | null;
    holderName?: string | null;
    holderEmail?: string | null;
  } | null;
}

export default function SquareDetailsModal({ isOpen, onClose, square }: SquareDetailsModalProps) {
  if (!square) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="modal-square-details">
        <DialogHeader>
          <DialogTitle>Square #{square.index} Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Entry Name</p>
              <p className="font-medium" data-testid="text-entry-name">
                {square.entryName || "Not set"}
              </p>
            </div>
          </div>

          {square.holderName && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium" data-testid="text-holder-name">
                  {square.holderName}
                </p>
              </div>
            </div>
          )}

          {square.holderEmail && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium break-all" data-testid="text-holder-email">
                  {square.holderEmail}
                </p>
              </div>
            </div>
          )}

          {!square.holderName && !square.holderEmail && (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">No additional information available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
