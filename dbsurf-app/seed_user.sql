CREATE DATABASE IF NOT EXISTS dbsurf;
USE dbsurf;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('Owner', 'DBA', 'Developer', 'Member') DEFAULT 'Member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert the user requested for the login page
INSERT IGNORE INTO users (username, email, password, role) 
VALUES ('byteuser', 'byteuser@dbsurf.local', 'bytebase123', 'Owner');
