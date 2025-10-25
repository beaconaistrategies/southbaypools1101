import { useState } from 'react';
import ClaimSquareModal from '../ClaimSquareModal';
import { Button } from '@/components/ui/button';

export default function ClaimSquareModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>
        Open Claim Modal
      </Button>
      <ClaimSquareModal
        open={open}
        onOpenChange={setOpen}
        squareNumber={42}
        onConfirm={(data) => {
          console.log('Square claimed:', data);
          setOpen(false);
        }}
      />
    </div>
  );
}
