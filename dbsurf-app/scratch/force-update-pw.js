import mysql from 'mysql2/promise';

async function updatePassword() {
  try {
    const config = {
      host: 'localhost',
      port: 3307,
      user: 'byteuser',
      password: 'bytebase123',
      database: 'dbsurf',
    };
    const connection = await mysql.createConnection(config);

    console.log('Updating instance 7 (lukal3306) password to "root123" just to be sure...');
    const [result] = await connection.query(
      "UPDATE instances SET db_password = 'root123', db_user = 'root' WHERE id = 7"
    );
    console.log(`Updated ${result.affectedRows} row.`);

    await connection.end();
  } catch (err) {
    console.error('Update failed:', err.message);
  }
}

updatePassword();
