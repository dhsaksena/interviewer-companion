-- Candidates imported from resumes. Run automatically by src/database/init.ts (npm run db:init).
-- Safe to re-run: every statement is CREATE TABLE IF NOT EXISTS.
-- Statements are split on a semicolon at end of line, so keep ';' out of comments.

-- The extracted profile is stored whole as JSON text. Name, email and headline are copied
-- into their own columns for listing and searching.
CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL DEFAULT '',
  headline VARCHAR(255) NOT NULL DEFAULT '',
  profile LONGTEXT NOT NULL,
  warnings TEXT,
  resume_file_name VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_candidates_updated_at (updated_at),
  INDEX idx_candidates_full_name (full_name)
);
