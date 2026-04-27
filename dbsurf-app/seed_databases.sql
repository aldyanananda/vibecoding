USE dbsurf;

CREATE TABLE IF NOT EXISTS databases (
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

-- Seed with some "Unassigned" databases for demonstration
-- These would normally be discovered via the Sync API
INSERT IGNORE INTO databases (name, instance_id, environment, engine, address) VALUES
('codex_tms', 1, 'Staging', 'mysql', '192.168.3.174'),
('dag_aaplatform_intools', 1, 'Staging', 'mysql', '192.168.3.182'),
('playcourt_dtp', 1, 'Staging', 'mysql', '192.168.3.68'),
('preprod-mytens-catalog', 1, 'Staging', 'mysql', '192.168.3.174');
