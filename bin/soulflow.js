#!/usr/bin/env node

import { Orchestrator } from '../lib/orchestrator.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * SoulFlow CLI - Command-line interface for workflow orchestration
 */

const commands = {
  run: runWorkflow,
  status: showStatus,
  list: listRuns,
  agents: showAgents,
  cancel: cancelRun,
  help: showHelp
};

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "soulflow help" for usage information');
    process.exit(1);
  }

  try {
    await commands[command](commandArgs);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

async function runWorkflow(args) {
  if (args.length === 0) {
    console.error('Usage: soulflow run <workflow.yaml> [--use-git]');
    process.exit(1);
  }

  const workflowPath = resolve(args[0]);
  const useGit = args.includes('--use-git') || args.includes('--git');

  const orchestrator = new Orchestrator();
  
  try {
    const result = await orchestrator.runWorkflow(workflowPath, { git: useGit });
    orchestrator.close();
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    orchestrator.close();
    throw error;
  }
}

function showStatus(args) {
  if (args.length === 0) {
    console.error('Usage: soulflow status <run-id>');
    process.exit(1);
  }

  const runId = args[0];
  const orchestrator = new Orchestrator();
  
  const status = orchestrator.getStatus(runId);
  orchestrator.close();

  if (!status) {
    console.error(`Run not found: ${runId}`);
    process.exit(1);
  }

  console.log(`\n📊 Workflow Run Status\n`);
  console.log(`ID: ${status.run.id}`);
  console.log(`Name: ${status.run.workflow_name}`);
  console.log(`Status: ${formatStatus(status.run.status)}`);
  console.log(`Created: ${formatTime(status.run.created_at)}`);
  
  if (status.run.completed_at) {
    const duration = status.run.completed_at - status.run.created_at;
    console.log(`Duration: ${formatDuration(duration)}`);
  }

  if (status.run.git_branch) {
    console.log(`Git Branch: ${status.run.git_branch}`);
  }

  console.log(`\n📝 Steps (${status.progress.completed}/${status.progress.total} completed):\n`);

  for (const step of status.steps) {
    const icon = getStatusIcon(step.status);
    const attempts = step.attempts > 1 ? ` (attempt ${step.attempts})` : '';
    console.log(`${icon} [${step.agent}] ${step.step_name}${attempts}`);
    
    if (step.status === 'failed' && step.error) {
      console.log(`  Error: ${step.error}`);
    }
    
    if (step.status === 'running') {
      const elapsed = Date.now() - step.started_at;
      console.log(`  Running for ${formatDuration(elapsed)}`);
    }
  }

  console.log('');
}

function listRuns(args) {
  const status = args[0] || null;
  const orchestrator = new Orchestrator();
  
  const runs = orchestrator.listRuns(status);
  orchestrator.close();

  if (runs.length === 0) {
    console.log('\nNo workflow runs found.\n');
    return;
  }

  console.log(`\n📋 Workflow Runs${status ? ` (${status})` : ''}:\n`);

  for (const run of runs) {
    const statusIcon = getStatusIcon(run.status);
    const time = formatTime(run.created_at);
    console.log(`${statusIcon} ${run.id}`);
    console.log(`   ${run.workflow_name} - ${time}`);
    
    if (run.status === 'running') {
      const elapsed = Date.now() - run.created_at;
      console.log(`   Running for ${formatDuration(elapsed)}`);
    }
    
    if (run.status === 'failed' && run.error) {
      console.log(`   Error: ${run.error}`);
    }
    
    console.log('');
  }
}

function showAgents(args) {
  const orchestrator = new Orchestrator();
  const agents = orchestrator.getAgentStatus();
  orchestrator.close();

  console.log(`\n🤖 Agent Status:\n`);

  if (agents.length === 0) {
    console.log('No active agents.\n');
    return;
  }

  for (const agent of agents) {
    console.log(`${agent.agent_type}:`);
    console.log(`  Total: ${agent.total}`);
    console.log(`  Busy: ${agent.busy}`);
    console.log(`  Idle: ${agent.idle}`);
    console.log('');
  }
}

function cancelRun(args) {
  if (args.length === 0) {
    console.error('Usage: soulflow cancel <run-id>');
    process.exit(1);
  }

  const runId = args[0];
  const orchestrator = new Orchestrator();
  
  orchestrator.cancelRun(runId);
  orchestrator.close();
}

function showHelp() {
  const version = getVersion();
  
  console.log(`
SoulFlow v${version} - Multi-Agent Workflow Orchestrator

USAGE:
  soulflow <command> [options]

COMMANDS:
  run <workflow.yaml>     Execute a workflow
    --use-git             Enable git integration (auto-commit changes)
  
  status <run-id>         Show workflow run status and progress
  
  list [status]           List all workflow runs
                          Optional status filter: pending, running, completed, failed
  
  agents                  Show agent status and availability
  
  cancel <run-id>         Cancel a running workflow
  
  help                    Show this help message

EXAMPLES:
  # Run a workflow
  soulflow run ./workflows/security-audit.yaml
  
  # Run with git integration
  soulflow run ./workflows/feature-dev.yaml --use-git
  
  # Check status
  soulflow status run-1234567890-abc123
  
  # List active runs
  soulflow list running
  
  # Show agent status
  soulflow agents

WORKFLOW FORMAT:
  Workflows are defined in YAML with the following structure:
  
  name: My Workflow
  description: Workflow description
  steps:
    - name: Step 1
      agent: planner
      task: Define the plan
      retry: 3
      verify_with: reviewer
    - name: Step 2
      agent: developer
      task: Implement solution
      escalate_to: reviewer

AGENT TYPES:
  - planner: Strategic planning and task decomposition
  - developer: Implementation and coding
  - verifier: Quality assurance and validation
  - tester: Testing and edge case coverage
  - reviewer: Final review and approval

Learn more: https://github.com/openclaw/soulflow
`);
}

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
    return pkg.version;
  } catch {
    return '2.0.0';
  }
}

function formatStatus(status) {
  const colors = {
    pending: '⏳',
    running: '▶️',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫',
    escalated: '⬆️'
  };
  return `${colors[status] || '❓'} ${status}`;
}

function getStatusIcon(status) {
  const icons = {
    pending: '⏳',
    running: '▶️',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫',
    escalated: '⬆️'
  };
  return icons[status] || '❓';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

main();
