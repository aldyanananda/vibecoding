
import mysql from 'mysql2/promise';

async function checkMongo() {
  try {
    const dbConfig = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'Password123!',
      database: 'dbsurf_clone'
    };
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query("SELECT * FROM instances WHERE engine LIKE '%mongo%';");
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
  } catch (error) {
    console.error(error);
  }
}
checkMongo();
