import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * AgentSystem - Manages specialized agents and their coordination
 * Each agent type has its own persona and workspace
 */
export class AgentSystem {
  constructor(stateManager, workspaceRoot = '.soulflow/agents') {
    this.stateManager = stateManager;
    this.workspaceRoot = workspaceRoot;
    
    // Agent personas and capabilities
    this.agentDefinitions = {
      planner: {
        role: 'planner',
        persona: 'Strategic planner who breaks down complex tasks into actionable steps',
        capabilities: ['task_decomposition', 'dependency_analysis', 'resource_planning'],
        workspace: join(workspaceRoot, 'planner')
      },
      developer: {
        role: 'developer',
        persona: 'Skilled developer who implements solutions following best practices',
        capabilities: ['coding', 'debugging', 'refactoring', 'testing'],
        workspace: join(workspaceRoot, 'developer')
      },
      verifier: {
        role: 'verifier',
        persona: 'Quality assurance specialist who verifies work meets requirements',
        capabilities: ['code_review', 'validation', 'compliance_check'],
        workspace: join(workspaceRoot, 'verifier')
      },
      tester: {
        role: 'tester',
        persona: 'Testing specialist who ensures functionality and reliability',
        capabilities: ['unit_testing', 'integration_testing', 'edge_case_testing'],
        workspace: join(workspaceRoot, 'tester')
      },
      reviewer: {
        role: 'reviewer',
        persona: 'Senior reviewer who provides final approval and recommendations',
        capabilities: ['final_review', 'documentation_review', 'architecture_review'],
        workspace: join(workspaceRoot, 'reviewer')
      }
    };

    this.initWorkspaces();
  }

  /**
   * Initialize workspace directories for each agent type
   */
  initWorkspaces() {
    for (const agent of Object.values(this.agentDefinitions)) {
      if (!existsSync(agent.workspace)) {
        mkdirSync(agent.workspace, { recursive: true });
      }

      // Create agent persona file
      const personaPath = join(agent.workspace, 'PERSONA.md');
      if (!existsSync(personaPath)) {
        const personaContent = `# ${agent.role.toUpperCase()} Agent

## Role
${agent.persona}

## Capabilities
${agent.capabilities.map(c => `- ${c}`).join('\n')}

## Responsibilities
- Claim and execute tasks assigned to ${agent.role} role
- Maintain workspace organization
- Report progress and results
- Coordinate with other agents when needed

## Workspace
${agent.workspace}
`;
        writeFileSync(personaPath, personaContent);
      }
    }
  }

  /**
   * Execute a step with the appropriate agent
   */
  async executeStep(stepId, workflow, step) {
    const agentType = step.agent;
    const agent = this.agentDefinitions[agentType];
    
    if (!agent) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Claim the step
    const agentId = this.stateManager.registerAgent(agentType);
    const claimed = this.stateManager.claimStep(stepId, agentId);
    
    if (!claimed) {
      throw new Error(`Failed to claim step ${stepId}`);
    }

    try {
      // Prepare agent context
      const context = this.prepareAgentContext(workflow, step, agent);
      
      // Execute using OpenClaw agent or standalone
      const result = await this.runAgent(agent, context, step.task);
      
      // If verification required, verify before completing
      if (step.verify_with) {
        const verificationResult = await this.verifyStep(stepId, step, result);
        if (!verificationResult.passed) {
          // Verification failed - retry or fail
          const retryResult = this.stateManager.failStep(stepId, `Verification failed: ${verificationResult.reason}`, true);
          if (retryResult === 'retry') {
            return { status: 'retry', reason: verificationResult.reason };
          } else {
            return { status: 'failed', reason: verificationResult.reason };
          }
        }
      }

      // Complete the step
      this.stateManager.completeStep(stepId, result);
      return { status: 'completed', result };

    } catch (error) {
      // Handle escalation
      if (step.escalate_to) {
        const newStepId = this.stateManager.escalateStep(stepId, step.escalate_to);
        return { status: 'escalated', newStepId, reason: error.message };
      }

      // Retry or fail
      const retryResult = this.stateManager.failStep(stepId, error.message, step.retry !== 0);
      return { status: retryResult, error: error.message };
    }
  }

  /**
   * Prepare context for agent execution
   */
  prepareAgentContext(workflow, step, agent) {
    const contextPath = join(agent.workspace, 'context.json');
    const context = {
      workflow: {
        name: workflow.name,
        description: workflow.description
      },
      step: {
        name: step.name,
        task: step.task,
        context: step.context || {}
      },
      agent: {
        role: agent.role,
        persona: agent.persona,
        capabilities: agent.capabilities,
        workspace: agent.workspace
      },
      timestamp: new Date().toISOString()
    };

    writeFileSync(contextPath, JSON.stringify(context, null, 2));
    return context;
  }

  /**
   * Run agent task (standalone mode)
   */
  async runAgent(agent, context, task) {
    // In standalone mode, we simulate agent work
    // In OpenClaw mode, this would spawn an actual agent session
    
    console.log(`[${agent.role}] Starting task: ${task}`);
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, return a success result
    // In production, this would execute actual agent logic
    return {
      success: true,
      agent: agent.role,
      task: task,
      output: `Task completed by ${agent.role}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verify a step's result with a different agent
   */
  async verifyStep(stepId, step, result) {
    const verifierType = step.verify_with;
    const verifier = this.agentDefinitions[verifierType];
    
    if (!verifier) {
      throw new Error(`Unknown verifier agent type: ${verifierType}`);
    }

    // Create verification record
    const verificationId = this.stateManager.createVerification(stepId, verifierType);

    try {
      console.log(`[${verifier.role}] Verifying step: ${step.name}`);
      
      // Prepare verification context
      const verificationContext = {
        step: step.name,
        task: step.task,
        result: result,
        criteria: step.verify_criteria || 'Check that the task was completed correctly'
      };

      // Simulate verification (in production, would run actual verification)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For now, pass verification
      const passed = true;
      const verificationResult = {
        passed,
        verifier: verifier.role,
        timestamp: new Date().toISOString()
      };

      this.stateManager.completeVerification(verificationId, passed, verificationResult);
      
      return { passed, reason: passed ? 'Verification passed' : 'Requirements not met' };

    } catch (error) {
      this.stateManager.completeVerification(verificationId, false, { error: error.message });
      return { passed: false, reason: error.message };
    }
  }

  /**
   * Get agent status summary
   */
  getAgentStatus() {
    return this.stateManager.getAgentStats();
  }

  /**
   * Check if OpenClaw agent system is available
   */
  isOpenClawAvailable() {
    try {
      // Check if we're running in OpenClaw environment
      return existsSync('/root/.openclaw') || process.env.OPENCLAW_SESSION;
    } catch {
      return false;
    }
  }
}
