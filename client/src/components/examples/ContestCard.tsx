import ContestCard from '../ContestCard';

export default function ContestCardExample() {
  return (
    <div className="max-w-md p-8">
      <ContestCard
        id="1"
        name="Week 8: SF vs DAL"
        eventDate={new Date('2025-10-27')}
        status="open"
        topTeam="San Francisco"
        leftTeam="Dallas"
        takenSquares={37}
        totalSquares={100}
        onManage={(id) => console.log('Manage contest:', id)}
        onViewPublic={(id) => console.log('View public:', id)}
      />
    </div>
  );
}
