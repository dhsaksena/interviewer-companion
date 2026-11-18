-- Reusable rubric sets. Run automatically by src/database/init.ts (npm run db:init).
-- Safe to re-run: every statement is CREATE TABLE IF NOT EXISTS.
-- Statements are split on a semicolon at end of line, so keep ';' out of comments.

-- A named, reusable list of rubrics for a role. Interviews copy from it and never link back to edit it.
CREATE TABLE IF NOT EXISTS rubric_sets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_rubric_sets_name (name)
);

-- Ordered rubrics (title + description) belonging to a rubric set.
CREATE TABLE IF NOT EXISTS rubric_set_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rubric_set_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  FOREIGN KEY (rubric_set_id) REFERENCES rubric_sets(id) ON DELETE CASCADE,
  INDEX idx_rubric_set_items_set (rubric_set_id, position)
);
