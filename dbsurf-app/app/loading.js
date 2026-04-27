import DolphinLoader from '@/app/components/DolphinLoader';

export default function Loading() {
  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f3f4f6' 
    }}>
      <DolphinLoader size={120} />
    </div>
  );
}
