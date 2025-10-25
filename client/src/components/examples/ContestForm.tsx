import ContestForm from '../ContestForm';

export default function ContestFormExample() {
  //todo: remove mock functionality
  const mockData = {
    name: "Week 8: SF vs DAL",
    eventDate: "2025-10-27",
    topTeam: "San Francisco",
    leftTeam: "Dallas",
    notes: "Championship game",
    topAxisNumbers: [3, 7, 0, 4, 8, 1, 5, 9, 2, 6],
    leftAxisNumbers: [1, 5, 9, 3, 7, 2, 6, 0, 4, 8],
    redRowsCount: 2,
    redColsCount: 2,
    redRows: [1, 3],
    redCols: [0, 4],
    isOpen: true,
    availableSquares: Array.from({ length: 100 }, (_, i) => i + 1).filter(n => n !== 15 && n !== 16)
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <ContestForm
        initialData={mockData}
        onSubmit={(data) => console.log('Form submitted:', data)}
        onCancel={() => console.log('Form cancelled')}
      />
    </div>
  );
}
