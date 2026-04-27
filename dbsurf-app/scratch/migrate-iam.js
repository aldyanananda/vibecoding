import mysql from 'mysql2/promise';

async function migrate() {
  const config = {
    host: 'localhost',
    port: 3307,
    user: 'byteuser',
    password: 'bytebase123',
    database: 'bytebase_clone',
  };
  const conn = await mysql.createConnection(config);
  try {
    console.log('Updating project_members table...');
    // MySQL 8.0.19+ supports ADD COLUMN IF NOT EXISTS, but for compatibility let's check it manually
    const [columns] = await conn.query('SHOW COLUMNS FROM project_members LIKE "all_databases"');
    if (columns.length === 0) {
      await conn.query('ALTER TABLE project_members ADD COLUMN all_databases BOOLEAN DEFAULT TRUE');
    }

    console.log('Creating project_database_members table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_database_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        database_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (database_id) REFERENCES list_all_db(id) ON DELETE CASCADE,
        UNIQUE KEY (project_id, user_id, database_id)
      )
    `);

    console.log('Normalizing roles in users table...');
    await conn.query("UPDATE users SET role = 'DBA' WHERE role IN ('Owner', 'DBA')");
    await conn.query("UPDATE users SET role = 'Developer' WHERE role IN ('Developer', 'Member')");
    
    console.log('Schema update complete.');
  } finally {
    await conn.end();
  }
}

migrate().catch(console.error);
