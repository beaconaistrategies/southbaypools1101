import { useState } from 'react';
import WinnersPanel from '../WinnersPanel';

export default function WinnersPanelExample() {
  const [winners, setWinners] = useState({
    q1: "23",
    q2: "",
    q3: "67",
    q4: ""
  });

  const handleUpdate = (quarter: 'q1' | 'q2' | 'q3' | 'q4', value: string) => {
    setWinners(prev => ({ ...prev, [quarter]: value }));
    console.log(`${quarter} winner updated:`, value);
  };

  return (
    <div className="p-8 max-w-4xl">
      <WinnersPanel
        q1Winner={winners.q1}
        q2Winner={winners.q2}
        q3Winner={winners.q3}
        q4Winner={winners.q4}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
