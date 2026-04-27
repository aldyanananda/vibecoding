export default function DolphinLoader({ overlay = false, size = 64 }) {
  const content = (
    <div className={overlay ? "loader-overlay" : "loader-container"} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <img 
        src="/dolphin-surf.png" 
        className="dolphin-loader" 
        alt="Loading..." 
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );

  return content;
}
