USE bytebase_clone;

-- 1. Create a default instance to match pre-seeded databases
INSERT IGNORE INTO instances (id, name, environment, engine, address, db_user, db_password) VALUES
(1, 'mysql-staging-01', 'Staging', 'MySQL', '127.0.0.1:3306', 'root', '');

-- 2. Create the renamed table
CREATE TABLE IF NOT EXISTS list_all_db (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  instance_id INT NOT NULL,
  project_id INT, -- Nullable if unassigned
  environment VARCHAR(50),
  engine VARCHAR(50),
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  UNIQUE KEY idx_name_instance (name, instance_id)
);

-- 3. Seed with some "Unassigned" databases for demonstration
INSERT IGNORE INTO list_all_db (name, instance_id, environment, engine, address) VALUES
('codex_tms', 1, 'Staging', 'MySQL', '127.0.0.1:3306'),
('dag_aaplatform_intools', 1, 'Staging', 'MySQL', '127.0.0.1:3306'),
('playcourt_dtp', 1, 'Staging', 'MySQL', '127.0.0.1:3306'),
('preprod-mytens-catalog', 1, 'Staging', 'MySQL', '127.0.0.1:3306');

-- Optional: Clean up the old problematic table if it exists
-- DROP TABLE IF EXISTS `databases`;
