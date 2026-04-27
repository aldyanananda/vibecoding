USE dbsurf;

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  project_key VARCHAR(191) NOT NULL UNIQUE,
  creator_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_key (project_key)
);

-- Insert sample projects
INSERT IGNORE INTO projects (name, project_key, creator_id) VALUES
('Default Project', 'DEFAULT', 1),
('E-commerce Backend', 'ECOMM', 1),
('Analytics Platform', 'ANALYTICS', 1);
