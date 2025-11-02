import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ReservedSquare {
  squareNumber: number;
  entryName: string;
  holderName: string;
  holderEmail: string;
}

interface ReserveSquaresProps {
  reservedSquares: ReservedSquare[];
  onReservationsChange: (reservations: ReservedSquare[]) => void;
  disabledSquares?: number[];
}

export default function ReserveSquares({
  reservedSquares,
  onReservationsChange,
  disabledSquares = [],
}: ReserveSquaresProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newReservation, setNewReservation] = useState({
    squareNumber: "",
    entryName: "",
    holderName: "",
    holderEmail: "",
  });

  const addReservation = () => {
    const squareNum = parseInt(newReservation.squareNumber);
    
    if (!squareNum || squareNum < 1 || squareNum > 100) {
      return;
    }

    if (reservedSquares.some(r => r.squareNumber === squareNum)) {
      return;
    }

    if (disabledSquares.includes(squareNum)) {
      return;
    }

    if (!newReservation.entryName.trim() || 
        !newReservation.holderName.trim() || 
        !newReservation.holderEmail.trim()) {
      return;
    }

    onReservationsChange([
      ...reservedSquares,
      {
        squareNumber: squareNum,
        entryName: newReservation.entryName.trim(),
        holderName: newReservation.holderName.trim(),
        holderEmail: newReservation.holderEmail.trim(),
      },
    ]);

    setNewReservation({
      squareNumber: "",
      entryName: "",
      holderName: "",
      holderEmail: "",
    });
    setShowAddDialog(false);
  };

  const removeReservation = (squareNumber: number) => {
    onReservationsChange(reservedSquares.filter(r => r.squareNumber !== squareNumber));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Reserved Squares ({reservedSquares.length})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          data-testid="button-add-reservation"
        >
          <Plus className="h-4 w-4 mr-2" />
          Reserve Square
        </Button>
      </div>

      {reservedSquares.length > 0 ? (
        <div className="space-y-2">
          {reservedSquares.map((reservation) => (
            <Card key={reservation.squareNumber} className="p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="font-mono">
                      #{reservation.squareNumber}
                    </Badge>
                    <span className="font-medium text-sm">{reservation.entryName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{reservation.holderName}</p>
                  <p className="text-xs text-muted-foreground">{reservation.holderEmail}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeReservation(reservation.squareNumber)}
                  data-testid={`button-remove-reservation-${reservation.squareNumber}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-md p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No reserved squares. Click "Reserve Square" to pre-assign squares to participants.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Reserved squares will be pre-assigned to participants and marked as taken when the contest is created.
      </p>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reserve Square</DialogTitle>
            <DialogDescription>
              Assign a specific square to a participant. This square will be marked as taken when the contest is created.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reserve-square-number">Square Number (1-100)</Label>
              <Input
                id="reserve-square-number"
                type="number"
                min="1"
                max="100"
                placeholder="e.g., 23"
                value={newReservation.squareNumber}
                onChange={(e) => setNewReservation({ ...newReservation, squareNumber: e.target.value })}
                data-testid="input-reserve-square-number"
              />
              {newReservation.squareNumber && reservedSquares.some(r => r.squareNumber === parseInt(newReservation.squareNumber)) && (
                <p className="text-xs text-destructive">This square is already reserved</p>
              )}
              {newReservation.squareNumber && disabledSquares.includes(parseInt(newReservation.squareNumber)) && (
                <p className="text-xs text-destructive">This square is disabled (not available)</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reserve-entry-name">Entry Name</Label>
              <Input
                id="reserve-entry-name"
                placeholder="e.g., John's Squares"
                value={newReservation.entryName}
                onChange={(e) => setNewReservation({ ...newReservation, entryName: e.target.value })}
                data-testid="input-reserve-entry-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reserve-holder-name">Participant Name</Label>
              <Input
                id="reserve-holder-name"
                placeholder="e.g., John Doe"
                value={newReservation.holderName}
                onChange={(e) => setNewReservation({ ...newReservation, holderName: e.target.value })}
                data-testid="input-reserve-holder-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reserve-holder-email">Participant Email</Label>
              <Input
                id="reserve-holder-email"
                type="email"
                placeholder="e.g., john@example.com"
                value={newReservation.holderEmail}
                onChange={(e) => setNewReservation({ ...newReservation, holderEmail: e.target.value })}
                data-testid="input-reserve-holder-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAddDialog(false)}
              data-testid="button-cancel-reservation"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={addReservation}
              disabled={
                !newReservation.squareNumber ||
                !newReservation.entryName.trim() ||
                !newReservation.holderName.trim() ||
                !newReservation.holderEmail.trim() ||
                reservedSquares.some(r => r.squareNumber === parseInt(newReservation.squareNumber)) ||
                disabledSquares.includes(parseInt(newReservation.squareNumber))
              }
              data-testid="button-confirm-reservation"
            >
              Reserve Square
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
