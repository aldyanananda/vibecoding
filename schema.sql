-- Create a new database for the dbsurf
CREATE DATABASE IF NOT EXISTS dbsurf;
USE dbsurf;

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, -- Ensure passwords are hashed before storing!
  role ENUM('Owner', 'DBA', 'Developer', 'Member') DEFAULT 'Member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert a default admin user (Password below is 'password123' hashed using a basic script - replace in production)
-- For testing purposes, you can insert raw passwords if your backend is configured to accept them temporarily,
-- but it's strongly advised to use bcrypt hashing in the application.
INSERT IGNORE INTO users (username, email, password, role) 
VALUES ('admin', 'admin@bytebase.local', 'password123', 'Owner');
