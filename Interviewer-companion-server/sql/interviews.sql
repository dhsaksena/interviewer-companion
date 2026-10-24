-- Interview + rubric tables. Run automatically by src/database/init.ts (npm run db:init).
-- Safe to re-run: every statement is CREATE TABLE IF NOT EXISTS.
-- Statements are split on a semicolon at end of line, so keep ';' out of comments.

-- An interview plan, optionally tied to a candidate.
CREATE TABLE IF NOT EXISTS interviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  candidate_name VARCHAR(255) NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_interviews_updated_at (updated_at),
  INDEX idx_interviews_title (title)
);

-- Ordered rubrics (title + description) belonging to an interview.
CREATE TABLE IF NOT EXISTS interview_rubrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  interview_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
  INDEX idx_rubrics_interview (interview_id, position)
);

-- Questions from the bank assigned to a rubric. A question can appear under several rubrics.
CREATE TABLE IF NOT EXISTS rubric_questions (
  rubric_id INT NOT NULL,
  question_id INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (rubric_id, question_id),
  FOREIGN KEY (rubric_id) REFERENCES interview_rubrics(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  INDEX idx_rubric_questions_question (question_id)
);
