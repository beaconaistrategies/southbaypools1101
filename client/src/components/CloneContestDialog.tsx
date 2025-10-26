import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CloneContestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalName: string;
  onConfirm: (name: string, eventDate: string) => void;
}

export default function CloneContestDialog({
  open,
  onOpenChange,
  originalName,
  onConfirm,
}: CloneContestDialogProps) {
  const [name, setName] = useState(`${originalName} (Copy)`);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name, eventDate);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-clone-contest">
        <DialogHeader>
          <DialogTitle>Clone Contest</DialogTitle>
          <DialogDescription>
            Create a copy of this contest with the same settings. All squares will be reset.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="clone-name">Contest Name</Label>
            <Input
              id="clone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter contest name"
              data-testid="input-clone-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="clone-date">Event Date</Label>
            <Input
              id="clone-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              data-testid="input-clone-date"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-clone"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!name.trim()}
            data-testid="button-confirm-clone"
          >
            Clone Contest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
