import { StateManager } from './state-manager.js';
import { WorkflowEngine } from './workflow-engine.js';
import { AgentSystem } from './agent-system.js';
import { GitIntegration } from './git-integration.js';

/**
 * Orchestrator - Main workflow execution engine
 * Coordinates agents, manages state, and executes workflows
 */
export class Orchestrator {
  constructor(options = {}) {
    this.dbPath = options.dbPath || '.soulflow/state.db';
    this.workspaceRoot = options.workspaceRoot || '.soulflow/agents';
    
    this.stateManager = new StateManager(this.dbPath);
    this.workflowEngine = new WorkflowEngine();
    this.agentSystem = new AgentSystem(this.stateManager, this.workspaceRoot);
    this.git = new GitIntegration(options.gitRepoPath);
  }

  /**
   * Execute a workflow from file
   */
  async runWorkflow(workflowPath, options = {}) {
    const useGit = options.git || false;

    // Load and validate workflow
    console.log(`\n🚀 Loading workflow: ${workflowPath}`);
    const workflow = this.workflowEngine.loadWorkflow(workflowPath);
    const info = this.workflowEngine.getWorkflowInfo(workflow);
    
    console.log(`   Name: ${info.name}`);
    console.log(`   Steps: ${info.stepCount}`);
    console.log(`   Agents: ${info.agents.join(', ')}`);
    console.log('');

    // Create workflow run
    const { id: runId, gitBranch } = this.stateManager.createRun(
      workflow.name,
      workflowPath,
      useGit
    );

    console.log(`📋 Run ID: ${runId}`);

    // Setup git if enabled
    if (useGit && this.git.isGitRepo()) {
      try {
        this.git.enable(gitBranch);
      } catch (error) {
        console.error(`⚠ Git integration failed: ${error.message}`);
        console.log('   Continuing without git...\n');
      }
    }

    // Create step executions
    const stepIds = [];
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const maxAttempts = step.retry !== undefined ? step.retry : 3;
      const stepId = this.stateManager.createStep(runId, step.name, i, step.agent, maxAttempts);
      stepIds.push(stepId);
    }

    console.log(`📝 Created ${stepIds.length} steps\n`);

    // Execute steps sequentially
    try {
      this.stateManager.updateRunStatus(runId, 'running');

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const stepId = stepIds[i];

        console.log(`\n[Step ${i + 1}/${workflow.steps.length}] ${step.name}`);
        console.log(`Agent: ${step.agent}`);
        console.log(`Task: ${step.task}`);

        const result = await this.executeStepWithRetry(stepId, workflow, step);

        if (result.status === 'completed') {
          console.log(`✓ Completed`);
          
          // Commit if git enabled
          if (useGit && this.git.enabled) {
            this.git.commitStep(step.name);
          }
        } else if (result.status === 'failed') {
          console.log(`✗ Failed: ${result.error}`);
          throw new Error(`Step "${step.name}" failed: ${result.error}`);
        } else if (result.status === 'escalated') {
          console.log(`⬆ Escalated to ${step.escalate_to}`);
          // Handle escalated step
          const escalatedStep = { ...step, agent: step.escalate_to };
          const escalateResult = await this.agentSystem.executeStep(result.newStepId, workflow, escalatedStep);
          
          if (escalateResult.status !== 'completed') {
            throw new Error(`Escalated step "${step.name}" failed`);
          }
          console.log(`✓ Escalation completed`);
        }
      }

      // Workflow completed successfully
      this.stateManager.updateRunStatus(runId, 'completed');
      console.log(`\n✅ Workflow completed successfully!`);
      console.log(`   Run ID: ${runId}\n`);

      return { success: true, runId };

    } catch (error) {
      // Workflow failed
      this.stateManager.updateRunStatus(runId, 'failed', error.message);
      console.log(`\n❌ Workflow failed: ${error.message}\n`);
      
      return { success: false, runId, error: error.message };
    }
  }

  /**
   * Execute a step with automatic retry logic
   */
  async executeStepWithRetry(stepId, workflow, step) {
    let lastResult = null;
    const maxAttempts = step.retry !== undefined ? step.retry : 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        console.log(`  Retry attempt ${attempt}/${maxAttempts}`);
      }

      lastResult = await this.agentSystem.executeStep(stepId, workflow, step);

      if (lastResult.status === 'completed') {
        return lastResult;
      }

      if (lastResult.status === 'escalated') {
        return lastResult;
      }

      if (lastResult.status === 'failed') {
        break; // Max retries exceeded
      }

      // Wait before retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return lastResult;
  }

  /**
   * Get status of a workflow run
   */
  getStatus(runId) {
    const run = this.stateManager.getRun(runId);
    if (!run) {
      return null;
    }

    const steps = this.stateManager.getRunSteps(runId);
    
    return {
      run,
      steps,
      progress: {
        total: steps.length,
        completed: steps.filter(s => s.status === 'completed').length,
        running: steps.filter(s => s.status === 'running').length,
        pending: steps.filter(s => s.status === 'pending').length,
        failed: steps.filter(s => s.status === 'failed').length
      }
    };
  }

  /**
   * List all workflow runs
   */
  listRuns(status = null) {
    return this.stateManager.listRuns(status);
  }

  /**
   * Get agent status
   */
  getAgentStatus() {
    return this.agentSystem.getAgentStatus();
  }

  /**
   * Cancel a running workflow
   */
  cancelRun(runId) {
    const run = this.stateManager.getRun(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    if (run.status === 'completed' || run.status === 'failed') {
      throw new Error(`Cannot cancel ${run.status} run`);
    }

    this.stateManager.updateRunStatus(runId, 'cancelled');
    console.log(`✓ Cancelled run: ${runId}`);
  }

  /**
   * Clean up resources
   */
  close() {
    this.stateManager.close();
  }
}
