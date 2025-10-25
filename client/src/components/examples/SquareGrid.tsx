import SquareGrid from '../SquareGrid';

export default function SquareGridExample() {
  //todo: remove mock functionality
  const mockSquares = Array.from({ length: 100 }, (_, i) => ({
    index: i + 1,
    row: Math.floor(i / 10),
    col: i % 10,
    status: i === 6 || i === 49 || i === 90 ? "taken" as const : 
            i === 15 || i === 16 ? "disabled" as const : 
            "available" as const,
    entryName: i === 6 ? "AK7" : i === 49 ? "Sam P" : i === 90 ? "JR91" : undefined,
    holderName: i === 6 ? "Alex Kim" : i === 49 ? "Sam Patel" : i === 90 ? "Jordan R" : undefined,
    holderEmail: i === 6 ? "alex@example.com" : i === 49 ? "sam@example.com" : i === 90 ? "jordan@example.com" : undefined,
  }));

  return (
    <div className="p-8">
      <SquareGrid
        topTeam="San Francisco"
        leftTeam="Dallas"
        topAxisNumbers={[3, 7, 0, 4, 8, 1, 5, 9, 2, 6]}
        leftAxisNumbers={[1, 5, 9, 3, 7, 2, 6, 0, 4, 8]}
        redRows={[1, 3]}
        redCols={[0, 4]}
        squares={mockSquares}
        onSquareClick={(square) => console.log('Square clicked:', square)}
      />
    </div>
  );
}
