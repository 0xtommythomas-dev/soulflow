import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * GitIntegration - Optional git operations for workflow execution
 * Auto-commits changes and manages branches per workflow run
 */
export class GitIntegration {
  constructor(repoPath = process.cwd()) {
    this.repoPath = repoPath;
    this.enabled = false;
    this.currentBranch = null;
  }

  /**
   * Check if git is available and repo is initialized
   */
  isGitRepo() {
    try {
      execSync('git rev-parse --git-dir', { cwd: this.repoPath, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enable git integration for a workflow run
   */
  enable(branchName) {
    if (!this.isGitRepo()) {
      throw new Error('Not a git repository. Initialize with: git init');
    }

    this.enabled = true;
    this.currentBranch = branchName;

    // Create and checkout new branch
    try {
      this.exec(`git checkout -b ${branchName}`);
      console.log(`✓ Created git branch: ${branchName}`);
    } catch (error) {
      // Branch might already exist
      try {
        this.exec(`git checkout ${branchName}`);
        console.log(`✓ Checked out existing branch: ${branchName}`);
      } catch (checkoutError) {
        throw new Error(`Failed to create/checkout branch: ${error.message}`);
      }
    }
  }

  /**
   * Commit changes after a step
   */
  commitStep(stepName, message = null) {
    if (!this.enabled) return;

    try {
      // Check if there are changes
      const status = this.exec('git status --porcelain');
      if (!status.trim()) {
        console.log('  No changes to commit');
        return;
      }

      // Stage all changes
      this.exec('git add -A');

      // Commit
      const commitMessage = message || `[SoulFlow] Complete step: ${stepName}`;
      this.exec(`git commit -m "${commitMessage}"`);
      
      const shortHash = this.exec('git rev-parse --short HEAD').trim();
      console.log(`  ✓ Committed: ${shortHash} - ${commitMessage}`);

    } catch (error) {
      console.error(`  ⚠ Failed to commit: ${error.message}`);
    }
  }

  /**
   * Get current branch
   */
  getCurrentBranch() {
    try {
      return this.exec('git rev-parse --abbrev-ref HEAD').trim();
    } catch {
      return null;
    }
  }

  /**
   * Get commit history for current branch
   */
  getCommitHistory(limit = 10) {
    try {
      const log = this.exec(`git log --oneline -${limit}`);
      return log.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Merge workflow branch back to main/master
   */
  mergeBranch(targetBranch = 'main') {
    if (!this.enabled || !this.currentBranch) {
      throw new Error('Git integration not enabled');
    }

    try {
      // Switch to target branch
      this.exec(`git checkout ${targetBranch}`);
      
      // Merge workflow branch
      this.exec(`git merge --no-ff ${this.currentBranch} -m "Merge workflow: ${this.currentBranch}"`);
      
      console.log(`✓ Merged ${this.currentBranch} into ${targetBranch}`);
      
      return true;
    } catch (error) {
      throw new Error(`Failed to merge branch: ${error.message}`);
    }
  }

  /**
   * Delete workflow branch
   */
  deleteBranch() {
    if (!this.currentBranch) return;

    try {
      // Make sure we're not on the branch we want to delete
      const current = this.getCurrentBranch();
      if (current === this.currentBranch) {
        this.exec('git checkout main || git checkout master');
      }

      this.exec(`git branch -D ${this.currentBranch}`);
      console.log(`✓ Deleted branch: ${this.currentBranch}`);
    } catch (error) {
      console.error(`⚠ Failed to delete branch: ${error.message}`);
    }
  }

  /**
   * Execute git command
   */
  exec(command) {
    return execSync(command, {
      cwd: this.repoPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }

  /**
   * Disable git integration
   */
  disable() {
    this.enabled = false;
  }
}
