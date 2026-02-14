# SoulFlow v2.0 - Multi-Agent Workflow Orchestrator

**Production-grade workflow orchestration with intelligent multi-agent coordination**

## Overview

SoulFlow v2.0 is a complete rewrite designed for enterprise-quality workflow automation. It orchestrates specialized agents (planner, developer, verifier, tester, reviewer) to execute complex multi-step workflows with automatic verification, retry logic, and robust state management.

## What It Does

- **Orchestrates Multi-Agent Workflows**: Coordinate specialized agents to complete complex tasks
- **YAML-Based Workflows**: Define workflows in human-readable YAML format
- **Automatic Verification**: Agents verify each other's work (no self-verification)
- **Retry & Escalation**: Configurable retry logic and automatic escalation on failure
- **State Persistence**: SQLite database tracks all workflow execution
- **Git Integration**: Optional auto-commit after each step with branch-per-workflow

## Use Cases

### 🔒 Security Audits
Run comprehensive security reviews with multiple verification stages:
- Vulnerability scanning
- Manual code review
- Penetration testing
- Remediation planning

### 🐛 Bug Fixes
Systematic bug fixing with proper testing:
- Root cause analysis
- Solution design and review
- Implementation with verification
- Regression testing

### ✨ Feature Development
End-to-end feature development:
- Requirements and architecture
- Backend/frontend implementation
- Comprehensive testing
- Documentation and review

## Installation

```bash
# Clone/download SoulFlow
cd soulflow-v2

# Link CLI globally
npm link

# Verify installation
soulflow help
```

## Quick Start

```bash
# Run a workflow
soulflow run examples/security-audit.yaml

# With git integration
soulflow run examples/feature-dev.yaml --use-git

# Check progress
soulflow list running

# Get detailed status
soulflow status <run-id>

# View agent status
soulflow agents
```

## Workflow Format

```yaml
name: My Workflow
description: What this does

steps:
  - name: Planning
    agent: planner
    task: Break down the requirements
    retry: 3
    verify_with: reviewer
  
  - name: Implementation
    agent: developer
    task: Write the code
    retry: 3
    escalate_to: reviewer
    verify_with: verifier
  
  - name: Testing
    agent: tester
    task: Run tests
    verify_with: verifier
```

## Agent Types

| Agent | Role | When to Use |
|-------|------|-------------|
| **planner** | Strategic planning & decomposition | Requirements, architecture, planning |
| **developer** | Implementation & coding | Building features, writing code |
| **verifier** | Quality assurance | Code review, validation |
| **tester** | Testing & edge cases | Running tests, QA |
| **reviewer** | Final approval | Senior review, sign-off |

## Key Features

### ✅ Verification Gates
Steps can require verification by a different agent:
```yaml
- name: Code Changes
  agent: developer
  task: Implement feature
  verify_with: verifier  # Verifier checks the work
```

### 🔄 Automatic Retry
Configure retries per step:
```yaml
- name: Complex Task
  agent: developer
  task: Difficult implementation
  retry: 5  # Try up to 5 times
```

### ⬆️ Escalation
Escalate failed steps to more experienced agents:
```yaml
- name: Challenging Work
  agent: developer
  task: Complex algorithm
  escalate_to: reviewer  # If retries fail, escalate
```

### 💾 State Persistence
All workflow state is persisted in SQLite:
- Workflow runs and status
- Step execution history
- Agent assignments
- Verification results

### 🔧 Git Integration
Enable with `--use-git`:
- Auto-commit after each step
- Branch per workflow run
- Clean change tracking
- Easy rollback

## CLI Commands

### `soulflow run <workflow.yaml> [--use-git]`
Execute a workflow with optional git integration.

### `soulflow status <run-id>`
Show detailed progress of a workflow run.

### `soulflow list [status]`
List all runs, optionally filtered by status (pending/running/completed/failed).

### `soulflow agents`
Show agent statistics (total/busy/idle per agent type).

### `soulflow cancel <run-id>`
Cancel a running workflow.

## Architecture

SoulFlow v2.0 is built on a clean, modular architecture:

- **Orchestrator**: Main execution engine
- **State Manager**: SQLite-based persistence
- **Workflow Engine**: YAML parsing and validation
- **Agent System**: Multi-agent coordination
- **Git Integration**: Optional VCS operations

All components use **zero external dependencies** - only Node.js 22 built-ins.

## Example Workflows Included

1. **security-audit.yaml**: Comprehensive security review
2. **bug-fix.yaml**: Systematic bug fixing workflow
3. **feature-dev.yaml**: End-to-end feature development

## Integration with OpenClaw

SoulFlow detects and integrates with OpenClaw automatically:

- Uses OpenClaw agents when available
- Falls back to standalone mode otherwise
- Agents can coordinate using OpenClaw messaging
- Works in both interactive and automated contexts

## Configuration

State and agent workspaces are stored in `.soulflow/`:
```
.soulflow/
├── state.db              # SQLite database
└── agents/               # Agent workspaces
    ├── planner/
    ├── developer/
    ├── verifier/
    ├── tester/
    └── reviewer/
```

## Advanced Usage

### Custom Workflows
Create your own workflows by following the YAML format:
1. Define workflow name and description
2. List steps with agent assignments
3. Add retry/verify/escalate as needed
4. Run with `soulflow run`

### Monitoring
Check workflow progress in real-time:
```bash
# List active workflows
soulflow list running

# Watch a specific run
watch -n 2 "soulflow status <run-id>"
```

### CI/CD Integration
SoulFlow works great in automated pipelines:
```bash
# Run workflow and exit with proper code
soulflow run workflow.yaml || exit 1

# Use git integration for clean commits
soulflow run workflow.yaml --use-git
```

## Design Principles

1. **Multi-Agent First**: Specialized agents that verify each other
2. **Production Ready**: Robust error handling, state persistence
3. **Zero Dependencies**: Only Node.js 22 built-ins
4. **Human-Readable**: YAML workflows, clear CLI output
5. **Git-Friendly**: Optional integration for change tracking
6. **CLI-Only**: No dashboard, built for automation

## Requirements

- **Node.js**: v22.0.0 or higher
- **OpenClaw**: Optional (enhances agent execution)
- **Git**: Optional (for `--use-git` flag)

## Troubleshooting

### "Unknown agent type"
Make sure you're using valid agent types: planner, developer, verifier, tester, reviewer.

### "Failed to create/checkout branch"
Check git is initialized: `git init` and you have a clean working tree.

### "Run not found"
Use `soulflow list` to see all run IDs.

## What's New in v2.0

Complete rewrite with:
- ✅ Multi-agent coordination
- ✅ Verification gates
- ✅ Retry and escalation logic
- ✅ SQLite state management
- ✅ Git integration
- ✅ YAML workflows (not JSON)
- ✅ Zero external dependencies
- ✅ Production-grade architecture

## Contributing

Ideas for enhancements:
- Additional agent types (security, docs, ops)
- Parallel step execution
- Conditional workflow branching
- Workflow templates library
- Agent learning from past runs

## License

MIT License

## Links

- [GitHub](https://github.com/openclaw/soulflow)
- [Documentation](https://github.com/openclaw/soulflow/blob/main/README.md)
- [OpenClaw](https://github.com/openclaw/openclaw)

---

**Tags**: workflow, orchestration, multi-agent, automation, ci-cd, yaml, testing, verification

**Version**: 2.0.0
