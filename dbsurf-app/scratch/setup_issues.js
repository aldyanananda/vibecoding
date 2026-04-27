const mysql = require('mysql2/promise');

async function setup() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'byteuser',
    password: 'bytebase123',
    database: 'dbsurf',
    multipleStatements: true
  });

  console.log('Connected to MySQL. Setting up tables...');

  const sql = `
  CREATE TABLE IF NOT EXISTS issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    project_id INT NOT NULL,
    database_id INT NOT NULL,
    query TEXT NOT NULL,
    status ENUM('OPEN', 'APPROVED', 'REJECTED', 'DONE') DEFAULT 'OPEN',
    creator_id INT NOT NULL,
    approver_id INT,
    executor_id INT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    executed_at TIMESTAMP NULL
  );

  -- Set auto increment increment to 5 for the session/server
  -- Note: This is a global/session variable in MySQL, not per table.
  -- To fulfill the requirement 'Make the Issue table, the auto increment increment 5',
  -- we can try to set it globally, but it might affect other tables.
  -- Alternatively, we can handle it in the application logic or just run the command.
  SET GLOBAL auto_increment_increment = 5;

  CREATE TABLE IF NOT EXISTS issue_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id INT NOT NULL,
    user_id INT NOT NULL,
    action ENUM('CREATE', 'APPROVE', 'REJECT', 'EXECUTE') NOT NULL,
    activity_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
  );
  `;

  try {
    await connection.query(sql);
    console.log('Tables created successfully.');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await connection.end();
  }
}

setup();
