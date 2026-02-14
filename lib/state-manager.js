import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

/**
 * StateManager - SQLite-based state management for workflow orchestration
 * Handles workflow runs, step execution, agent assignments, and results
 */
export class StateManager {
  constructor(dbPath = '.soulflow/state.db') {
    const dir = dbPath.split('/').slice(0, -1).join('/');
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  initSchema() {
    // Workflow runs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY,
        workflow_name TEXT NOT NULL,
        workflow_path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER,
        error TEXT,
        use_git INTEGER DEFAULT 0,
        git_branch TEXT
      )
    `);

    // Step executions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS step_executions (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_name TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        assigned_agent TEXT,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        result TEXT,
        error TEXT,
        escalated_from TEXT,
        FOREIGN KEY (run_id) REFERENCES workflow_runs(id)
      )
    `);

    // Agent sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id TEXT PRIMARY KEY,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle',
        current_step_id TEXT,
        last_heartbeat INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (current_step_id) REFERENCES step_executions(id)
      )
    `);

    // Verification gates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS verifications (
        id TEXT PRIMARY KEY,
        step_id TEXT NOT NULL,
        verifier_agent TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        result TEXT,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        FOREIGN KEY (step_id) REFERENCES step_executions(id)
      )
    `);

    // Create indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_runs_status ON workflow_runs(status)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_steps_status ON step_executions(status, run_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_status ON agent_sessions(status)`);
  }

  // Workflow Run Operations
  createRun(workflowName, workflowPath, useGit = false) {
    const id = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const gitBranch = useGit ? `soulflow/${workflowName}/${id}` : null;

    const stmt = this.db.prepare(`
      INSERT INTO workflow_runs (id, workflow_name, workflow_path, status, created_at, updated_at, use_git, git_branch)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
    `);
    stmt.run(id, workflowName, workflowPath, now, now, useGit ? 1 : 0, gitBranch);

    return { id, gitBranch };
  }

  getRun(runId) {
    const stmt = this.db.prepare('SELECT * FROM workflow_runs WHERE id = ?');
    return stmt.get(runId);
  }

  listRuns(status = null) {
    let query = 'SELECT * FROM workflow_runs';
    if (status) {
      query += ' WHERE status = ?';
      const stmt = this.db.prepare(query);
      return stmt.all(status);
    }
    const stmt = this.db.prepare(query);
    return stmt.all();
  }

  updateRunStatus(runId, status, error = null) {
    const now = Date.now();
    const completedAt = ['completed', 'failed', 'cancelled'].includes(status) ? now : null;
    
    const stmt = this.db.prepare(`
      UPDATE workflow_runs 
      SET status = ?, updated_at = ?, completed_at = ?, error = ?
      WHERE id = ?
    `);
    stmt.run(status, now, completedAt, error, runId);
  }

  // Step Execution Operations
  createStep(runId, stepName, stepIndex, agentType, maxAttempts = 3) {
    const id = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO step_executions 
      (id, run_id, step_name, step_index, agent_type, status, created_at, max_attempts)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `);
    stmt.run(id, runId, stepName, stepIndex, agentType, now, maxAttempts);

    return id;
  }

  getStep(stepId) {
    const stmt = this.db.prepare('SELECT * FROM step_executions WHERE id = ?');
    return stmt.get(stepId);
  }

  getRunSteps(runId) {
    const stmt = this.db.prepare('SELECT * FROM step_executions WHERE run_id = ? ORDER BY step_index');
    return stmt.all(runId);
  }

  claimStep(stepId, agentId) {
    const now = Date.now();
    const step = this.getStep(stepId);
    
    if (!step || step.status !== 'pending') {
      return false;
    }

    const stmt = this.db.prepare(`
      UPDATE step_executions 
      SET status = 'running', assigned_agent = ?, started_at = ?, attempts = attempts + 1
      WHERE id = ? AND status = 'pending'
    `);
    const result = stmt.run(agentId, now, stepId);
    return result.changes > 0;
  }

  completeStep(stepId, result) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE step_executions 
      SET status = 'completed', completed_at = ?, result = ?
      WHERE id = ?
    `);
    stmt.run(now, JSON.stringify(result), stepId);
  }

  failStep(stepId, error, canRetry = true) {
    const step = this.getStep(stepId);
    const now = Date.now();

    if (canRetry && step.attempts < step.max_attempts) {
      // Reset to pending for retry
      const stmt = this.db.prepare(`
        UPDATE step_executions 
        SET status = 'pending', error = ?
        WHERE id = ?
      `);
      stmt.run(error, stepId);
      return 'retry';
    } else {
      // Mark as failed
      const stmt = this.db.prepare(`
        UPDATE step_executions 
        SET status = 'failed', completed_at = ?, error = ?
        WHERE id = ?
      `);
      stmt.run(now, error, stepId);
      return 'failed';
    }
  }

  escalateStep(stepId, newAgentType) {
    const step = this.getStep(stepId);
    const newId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // Create new escalated step
    const stmt = this.db.prepare(`
      INSERT INTO step_executions 
      (id, run_id, step_name, step_index, agent_type, status, created_at, max_attempts, escalated_from)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `);
    stmt.run(newId, step.run_id, step.step_name, step.step_index, newAgentType, now, step.max_attempts, stepId);

    // Mark original as escalated
    const updateStmt = this.db.prepare(`
      UPDATE step_executions 
      SET status = 'escalated'
      WHERE id = ?
    `);
    updateStmt.run(stepId);

    return newId;
  }

  // Agent Session Operations
  registerAgent(agentType) {
    const id = `agent-${agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO agent_sessions (id, agent_type, status, last_heartbeat, created_at)
      VALUES (?, ?, 'idle', ?, ?)
    `);
    stmt.run(id, agentType, now, now);

    return id;
  }

  updateAgentHeartbeat(agentId) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE agent_sessions 
      SET last_heartbeat = ?
      WHERE id = ?
    `);
    stmt.run(now, agentId);
  }

  getAgentStats() {
    const stmt = this.db.prepare(`
      SELECT 
        agent_type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'busy' THEN 1 ELSE 0 END) as busy,
        SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle
      FROM agent_sessions
      WHERE last_heartbeat > ?
      GROUP BY agent_type
    `);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return stmt.all(fiveMinutesAgo);
  }

  // Verification Operations
  createVerification(stepId, verifierAgent) {
    const id = `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO verifications (id, step_id, verifier_agent, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)
    `);
    stmt.run(id, stepId, verifierAgent, now);

    return id;
  }

  completeVerification(verificationId, passed, result) {
    const now = Date.now();
    const status = passed ? 'passed' : 'failed';

    const stmt = this.db.prepare(`
      UPDATE verifications 
      SET status = ?, result = ?, completed_at = ?
      WHERE id = ?
    `);
    stmt.run(status, JSON.stringify(result), now, verificationId);
  }

  getStepVerification(stepId) {
    const stmt = this.db.prepare('SELECT * FROM verifications WHERE step_id = ? ORDER BY created_at DESC LIMIT 1');
    return stmt.get(stepId);
  }

  // Utility
  close() {
    this.db.close();
  }
}
