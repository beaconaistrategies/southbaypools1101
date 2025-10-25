import TopNav from '../TopNav';

export default function TopNavExample() {
  return (
    <TopNav 
      title="SquareKeeper" 
      actionLabel="New Contest" 
      showAction={true}
      onAction={() => console.log('New Contest clicked')}
    />
  );
}
