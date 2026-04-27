import React from 'react';

const EngineIcon = ({ engine, size = 18 }) => {
  const e = (engine || '').toLowerCase();

  const styles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`
  };

  // MySQL Icon (Official Logo with Text)
  if (e === 'mysql') {
    return (
      <div style={{ ...styles, width: `${size * 2}px` }} title="MySQL">
        <img 
          src="https://www.vectorlogo.zone/logos/mysql/mysql-ar21.svg" 
          alt="MySQL" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain'
          }} 
        />
      </div>
    );
  }

  // PostgreSQL Icon (Official Elephant)
  if (e === 'postgres' || e === 'postgresql') {
    return (
      <div style={styles} title="PostgreSQL">
        <img 
          src="https://wiki.postgresql.org/images/a/a4/PostgreSQL_logo.3colors.svg" 
          alt="Postgres" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain',
            transform: 'scale(1.2)'
          }} 
        />
      </div>
    );
  }

  // MongoDB Icon (Official Leaf)
  if (e === 'mongodb' || e === 'mongo') {
    return (
      <div style={styles} title="MongoDB">
        <img 
          src="https://www.vectorlogo.zone/logos/mongodb/mongodb-icon.svg" 
          alt="MongoDB" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain'
          }} 
        />
      </div>
    );
  }

  // Fallback Database Icon
  return (
    <div style={styles} title={engine || 'Database'}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    </div>
  );
};

export default EngineIcon;
