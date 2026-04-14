import mysql from 'mysql2/promise';

async function research() {
  try {
    const config = {
      host: 'localhost',
      port: 3307,
      user: 'byteuser',
      password: 'bytebase123',
      database: 'bytebase_clone',
    };
    const connection = await mysql.createConnection(config);

    console.log('--- SHOW TABLES ---');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(tables);

    console.log('--- users table structure ---');
    const [userColumns] = await connection.query('DESCRIBE users');
    console.log(userColumns);

    console.log('--- projects table structure ---');
    const [projectColumns] = await connection.query('DESCRIBE projects');
    console.log(projectColumns);

    console.log('--- list_all_db table structure ---');
    const [dbColumns] = await connection.query('DESCRIBE list_all_db');
    console.log(dbColumns);

    console.log('--- All projects ---');
    const [projects] = await connection.query('SELECT * FROM projects');
    console.log(projects);

    await connection.end();
  } catch (err) {
    console.error('Research failed:', err);
  }
}

research();
