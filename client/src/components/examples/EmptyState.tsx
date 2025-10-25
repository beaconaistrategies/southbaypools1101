import EmptyState from '../EmptyState';
import { Grid3x3 } from 'lucide-react';

export default function EmptyStateExample() {
  return (
    <div className="p-8">
      <EmptyState
        icon={Grid3x3}
        title="No contests yet — create your first one."
        description="Start managing your football squares pools by creating a new contest."
        actionLabel="New Contest"
        onAction={() => console.log('New Contest clicked')}
      />
    </div>
  );
}
