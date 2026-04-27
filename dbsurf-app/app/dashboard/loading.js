import DolphinLoader from '@/app/components/DolphinLoader';

export default function Loading() {
  return (
    <div style={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '4rem'
    }}>
      <DolphinLoader size={80} />
    </div>
  );
}
