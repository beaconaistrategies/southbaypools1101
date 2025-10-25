import StatusBadge from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="flex gap-4 p-8">
      <StatusBadge status="open" />
      <StatusBadge status="locked" />
    </div>
  );
}
