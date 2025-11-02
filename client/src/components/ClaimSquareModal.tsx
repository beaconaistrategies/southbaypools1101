import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClaimSquareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squareNumber: number;
  onConfirm: (data: { holderName: string; holderEmail: string; entryName: string }) => void;
  isRandom?: boolean;
}

export default function ClaimSquareModal({
  open,
  onOpenChange,
  squareNumber,
  onConfirm,
  isRandom = false
}: ClaimSquareModalProps) {
  const [holderName, setHolderName] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  const [entryName, setEntryName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!holderName.trim()) {
      newErrors.holderName = "Name is required";
    }
    if (!holderEmail.trim()) {
      newErrors.holderEmail = "Email is required";
    } else if (!validateEmail(holderEmail)) {
      newErrors.holderEmail = "Please enter a valid email";
    }
    if (!entryName.trim()) {
      newErrors.entryName = "Entry name is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onConfirm({ holderName, holderEmail, entryName });
      setHolderName("");
      setHolderEmail("");
      setEntryName("");
      setErrors({});
    }
  };

  const handleCancel = () => {
    setHolderName("");
    setHolderEmail("");
    setEntryName("");
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-claim-square">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isRandom ? "Pick a Square For Me" : `Claim Square #${squareNumber}`}
          </DialogTitle>
          <DialogDescription>
            {isRandom 
              ? "We'll randomly select an available square and assign it to you" 
              : "Enter your information to reserve this square"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holderName">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="holderName"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Your full name"
              data-testid="input-holder-name"
            />
            {errors.holderName && (
              <p className="text-sm text-destructive">{errors.holderName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="holderEmail">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="holderEmail"
              type="email"
              value={holderEmail}
              onChange={(e) => setHolderEmail(e.target.value)}
              placeholder="your.email@example.com"
              data-testid="input-holder-email"
            />
            {errors.holderEmail && (
              <p className="text-sm text-destructive">{errors.holderEmail}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryName">
              Entry Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="entryName"
              value={entryName}
              onChange={(e) => setEntryName(e.target.value)}
              placeholder="Display name for the board"
              data-testid="input-entry-name"
            />
            <p className="text-xs text-muted-foreground">
              Your entry name will appear on the board
            </p>
            {errors.entryName && (
              <p className="text-sm text-destructive">{errors.entryName}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" data-testid="button-confirm">
              Confirm My Square
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
