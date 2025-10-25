import { useState } from 'react';
import ConfirmDialog from '../ConfirmDialog';
import { Button } from '@/components/ui/button';

export default function ConfirmDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)} variant="destructive">
        Delete Contest
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Contest?"
        description="This action cannot be undone. All squares and data for this contest will be permanently deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          console.log('Contest deleted');
          setOpen(false);
        }}
      />
    </div>
  );
}
