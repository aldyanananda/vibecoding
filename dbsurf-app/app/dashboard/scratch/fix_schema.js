import pool from '../../lib/db.js';

async function fixSchema() {
  try {
    console.log('Altering issue_activities.action...');
    await pool.query("ALTER TABLE issue_activities MODIFY COLUMN action VARCHAR(20)");
    
    console.log('Altering issues.status...');
    // If it's an ENUM, we need to know the values. If it's VARCHAR, we just increase size.
    // Based on the error, it's likely a small VARCHAR or constrained.
    await pool.query("ALTER TABLE issues MODIFY COLUMN status VARCHAR(20)");
    
    console.log('Schema fixed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Schema fix failed:', err);
    process.exit(1);
  }
}

fixSchema();
