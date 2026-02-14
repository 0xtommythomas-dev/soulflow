# SoulFlow v2.0

**Production-grade multi-agent workflow orchestrator for OpenClaw**

SoulFlow v2.0 is a complete rewrite designed to match enterprise-quality orchestration systems. It provides intelligent multi-agent coordination, automatic verification, retry logic, and robust state management.

## 🌟 Features

### Multi-Agent System
- **5 Specialized Agents**: planner, developer, verifier, tester, reviewer
- Each agent has its own workspace and persona
- Agents verify each other's work (never self-verification)
- Agent-to-agent coordination and communication

### Workflow Engine
- **YAML-based workflows** (human-readable, version-controllable)
- Step-by-step execution with agent assignment
- Configurable retry logic per step
- Escalation paths (try agent A, escalate to agent B on failure)
- Verification gates between critical steps

### State Management
- **SQLite database** for persistent state
- Track workflow runs, step execution, agent assignments
- Query run history and progress
- Support for concurrent workflow execution

### Git Integration (Optional)
- Automatic commits after each step
- Branch per workflow run
- Clean separation of workflow changes
- Easy rollback and change tracking

## 🚀 Quick Start

### Installation

```bash
cd /root/.openclaw/workspace/soulflow-v2
npm link
```

### Run Your First Workflow

```bash
# Run a security audit
soulflow run examples/security-audit.yaml

# Run with git integration
soulflow run examples/bug-fix.yaml --use-git

# Check progress
soulflow list

# Get detailed status
soulflow status run-1234567890-abc123
```

## 📋 Workflow Format

Workflows are defined in YAML:

```yaml
name: My Workflow
description: What this workflow does

steps:
  - name: Planning Phase
    agent: planner
    task: Break down the problem into actionable steps
    retry: 3
    verify_with: reviewer
  
  - name: Implementation
    agent: developer
    task: Implement the solution
    retry: 3
    escalate_to: reviewer
  
  - name: Testing
    agent: tester
    task: Run comprehensive tests
    verify_with: verifier
  
  - name: Final Review
    agent: reviewer
    task: Approve for deployment
```

### Workflow Fields

- **name**: Workflow name (required)
- **description**: What the workflow does
- **steps**: Array of steps to execute

### Step Fields

- **name**: Step name (required)
- **agent**: Agent type to handle this step (required)
  - Options: `planner`, `developer`, `verifier`, `tester`, `reviewer`
- **task**: Description of what to do (required)
- **retry**: Max retry attempts (default: 3)
- **verify_with**: Agent type to verify the result
- **escalate_to**: Agent type to escalate to on failure
- **context**: Additional context data for the step

## 🤖 Agent Types

### Planner
Strategic planner who breaks down complex tasks into actionable steps.

**Capabilities:**
- Task decomposition
- Dependency analysis
- Resource planning

### Developer
Skilled developer who implements solutions following best practices.

**Capabilities:**
- Coding
- Debugging
- Refactoring
- Testing

### Verifier
Quality assurance specialist who verifies work meets requirements.

**Capabilities:**
- Code review
- Validation
- Compliance checking

### Tester
Testing specialist who ensures functionality and reliability.

**Capabilities:**
- Unit testing
- Integration testing
- Edge case testing

### Reviewer
Senior reviewer who provides final approval and recommendations.

**Capabilities:**
- Final review
- Documentation review
- Architecture review

## 💡 Key Concepts

### Verification Gates
Steps can specify `verify_with` to have another agent verify the work:

```yaml
- name: Implementation
  agent: developer
  task: Write the code
  verify_with: verifier  # Verifier agent checks the work
```

This ensures no agent verifies their own work.

### Retry Logic
Configure automatic retries per step:

```yaml
- name: Complex Task
  agent: developer
  task: Implement feature
  retry: 5  # Try up to 5 times before failing
```

### Escalation
If a step fails after retries, escalate to a more experienced agent:

```yaml
- name: Difficult Implementation
  agent: developer
  task: Implement complex algorithm
  retry: 3
  escalate_to: reviewer  # If all retries fail, escalate to reviewer
```

## 📊 State Management

SoulFlow uses SQLite to track:

- **Workflow runs**: Status, timing, results
- **Step executions**: Which agent, attempts, results
- **Agent sessions**: Active agents and their status
- **Verifications**: Verification results and outcomes

All state is persisted in `.soulflow/state.db`.

## 🔧 CLI Commands

### Run Workflow
```bash
soulflow run <workflow.yaml> [--use-git]
```

Execute a workflow. Use `--use-git` to enable automatic commits.

### Check Status
```bash
soulflow status <run-id>
```

Show detailed status of a workflow run including step progress.

### List Runs
```bash
soulflow list [status]
```

List all workflow runs. Optionally filter by status:
- `pending`
- `running`
- `completed`
- `failed`

### Agent Status
```bash
soulflow agents
```

Show status of all agent types (total, busy, idle).

### Cancel Run
```bash
soulflow cancel <run-id>
```

Cancel a running workflow.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           CLI Interface                      │
│  (soulflow run/status/list/agents)          │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Orchestrator                       │
│  - Workflow execution                        │
│  - Step coordination                         │
│  - State management                          │
└──┬────────────────────────────────────────┬─┘
   │                                        │
┌──▼────────────────┐            ┌─────────▼────┐
│  Agent System     │            │ State Manager │
│  - Agent dispatch │            │  (SQLite DB)  │
│  - Verification   │            │               │
│  - Coordination   │            │  - Runs       │
└──┬────────────────┘            │  - Steps      │
   │                             │  - Agents     │
┌──▼────────────────┐            │  - Verifications │
│  Specialized      │            └───────────────┘
│  Agents           │
│                   │
│  ┌─────────────┐  │
│  │  Planner    │  │
│  ├─────────────┤  │
│  │  Developer  │  │
│  ├─────────────┤  │
│  │  Verifier   │  │
│  ├─────────────┤  │
│  │  Tester     │  │
│  ├─────────────┤  │
│  │  Reviewer   │  │
│  └─────────────┘  │
└───────────────────┘
```

## 📁 Project Structure

```
soulflow-v2/
├── bin/
│   └── soulflow.js         # CLI entry point
├── lib/
│   ├── index.js            # Main exports
│   ├── orchestrator.js     # Workflow orchestration
│   ├── state-manager.js    # SQLite state management
│   ├── workflow-engine.js  # YAML parsing & validation
│   ├── agent-system.js     # Multi-agent coordination
│   └── git-integration.js  # Optional git operations
├── examples/
│   ├── security-audit.yaml
│   ├── bug-fix.yaml
│   └── feature-dev.yaml
├── package.json
└── README.md
```

## 🎯 Design Principles

1. **Zero External Dependencies**: Uses only Node.js 22 built-ins
2. **Production-Grade**: Robust error handling, state persistence, retry logic
3. **Multi-Agent**: Specialized agents that verify each other's work
4. **YAML First**: Human-readable, version-controllable workflows
5. **CLI-Only**: No dashboard, focus on automation and scripting
6. **Git-Friendly**: Optional git integration for change tracking

## 🔌 Integration with OpenClaw

SoulFlow v2.0 is designed to work seamlessly with OpenClaw's agent system:

- Detects OpenClaw environment automatically
- Can spawn actual OpenClaw agents for step execution
- Falls back to standalone mode when OpenClaw unavailable
- Agents can use OpenClaw messaging for coordination

## 📝 Example Workflows

### Security Audit
Comprehensive security review with multiple verification stages:
```bash
soulflow run examples/security-audit.yaml
```

### Bug Fix
Systematic bug fixing with testing and verification:
```bash
soulflow run examples/bug-fix.yaml
```

### Feature Development
End-to-end feature development with checkpoints:
```bash
soulflow run examples/feature-dev.yaml
```

## 🤝 Contributing

SoulFlow v2.0 is part of the OpenClaw ecosystem. Contributions welcome!

### Areas for Enhancement
- Additional agent types (security, docs, ops)
- Parallel step execution
- Conditional branching in workflows
- Workflow templates and presets
- Integration with more VCS systems
- Agent learning from past executions

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Links

- [OpenClaw](https://github.com/openclaw/openclaw)
- [ClawHub Skills](https://clawhub.io)

---

Built with ❤️ for the OpenClaw community
