import mysql from 'mysql2/promise';

async function updatePort() {
  try {
    const config = {
      host: 'localhost',
      port: 3307,
      user: 'byteuser',
      password: 'bytebase123',
      database: 'bytebase_clone',
    };
    const connection = await mysql.createConnection(config);

    console.log('Updating instance addresses from 3306 to 3307...');
    const [result] = await connection.query(
      "UPDATE instances SET address = 'localhost:3307' WHERE address = 'localhost:3306'"
    );
    console.log(`Updated ${result.affectedRows} rows in instances table.`);

    console.log('Updating list_all_db addresses from 3306 to 3307...');
    const [result2] = await connection.query(
      "UPDATE list_all_db SET address = 'localhost:3307' WHERE address = 'localhost:3306'"
    );
    console.log(`Updated ${result2.affectedRows} rows in list_all_db table.`);

    await connection.end();
  } catch (err) {
    console.error('Update failed:', err);
  }
}

updatePort();
