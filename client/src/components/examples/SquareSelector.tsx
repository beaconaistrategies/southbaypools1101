import { useState } from 'react';
import SquareSelector from '../SquareSelector';

export default function SquareSelectorExample() {
  const [selectedSquares, setSelectedSquares] = useState<number[]>(
    Array.from({ length: 98 }, (_, i) => i + 1).filter(n => n !== 15 && n !== 16)
  );

  return (
    <div className="p-8 max-w-4xl">
      <SquareSelector
        selectedSquares={selectedSquares}
        onSelectionChange={(squares) => {
          setSelectedSquares(squares);
          console.log('Selected squares:', squares);
        }}
      />
    </div>
  );
}
