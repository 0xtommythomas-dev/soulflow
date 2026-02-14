# SoulFlow v2.0 - Quick Start Guide

## Installation (1 minute)

```bash
# Navigate to SoulFlow
cd /root/.openclaw/workspace/soulflow-v2

# Install CLI globally
npm link

# Verify installation
soulflow help
```

That's it! No dependencies to install.

## Your First Workflow (2 minutes)

### Run the demo:
```bash
soulflow run examples/simple-demo.yaml
```

You'll see:
- 4 steps executing sequentially
- Different agents handling each step
- Verification gates in action
- Completion status

### Check the results:
```bash
# List all runs
soulflow list

# Get detailed status (use your run ID)
soulflow status run-XXXXX-XXXXX

# See agent statistics
soulflow agents
```

## Try More Complex Workflows

### Bug Fix Workflow (8 steps):
```bash
soulflow run examples/bug-fix.yaml
```

### Security Audit (7 steps):
```bash
soulflow run examples/security-audit.yaml
```

### Feature Development (13 steps):
```bash
soulflow run examples/feature-dev.yaml
```

## With Git Integration

```bash
# Initialize git if needed
git init
git config user.email "you@example.com"
git config user.name "Your Name"
git add -A && git commit -m "Initial commit"

# Run workflow with auto-commit
soulflow run examples/bug-fix.yaml --use-git

# Check git log
git log --oneline
```

## Create Your Own Workflow

Create a file `my-workflow.yaml`:

```yaml
name: My Custom Workflow
description: What this workflow does

steps:
  - name: Step 1
    agent: planner
    task: Plan the work
    retry: 2
    verify_with: reviewer
  
  - name: Step 2
    agent: developer
    task: Do the work
    retry: 3
    verify_with: verifier
  
  - name: Step 3
    agent: tester
    task: Test the work
    retry: 2
  
  - name: Step 4
    agent: reviewer
    task: Final approval
```

Run it:
```bash
soulflow run my-workflow.yaml
```

## Agent Types

Use these in your workflows:

- **planner** - Strategic planning, task decomposition
- **developer** - Implementation, coding
- **verifier** - Quality assurance, validation
- **tester** - Testing, edge cases
- **reviewer** - Final review, approval

## Key Features to Try

### Verification Gates
```yaml
- name: Important Step
  agent: developer
  task: Do something critical
  verify_with: verifier  # Different agent verifies
```

### Retry Logic
```yaml
- name: Challenging Task
  agent: developer
  task: Complex work
  retry: 5  # Try up to 5 times
```

### Escalation
```yaml
- name: Difficult Work
  agent: developer
  task: Hard problem
  retry: 3
  escalate_to: reviewer  # Escalate if all retries fail
```

## Common Commands

```bash
# Execute workflow
soulflow run <workflow.yaml> [--use-git]

# Check status
soulflow status <run-id>

# List workflows
soulflow list [pending|running|completed|failed]

# Agent status
soulflow agents

# Cancel running workflow
soulflow cancel <run-id>

# Help
soulflow help
```

## State Files

SoulFlow stores state in `.soulflow/`:

```
.soulflow/
├── state.db           # SQLite database (all workflow data)
└── agents/            # Agent workspaces
    ├── planner/
    ├── developer/
    ├── verifier/
    ├── tester/
    └── reviewer/
```

You can delete `.soulflow/` to start fresh.

## Troubleshooting

### "Unknown agent type"
Use only: planner, developer, verifier, tester, reviewer

### "Workflow must have a name"
Add `name:` at the top of your YAML file

### "Failed to create/checkout branch"
Make sure git is initialized and you have a clean working tree

### "Run not found"
Use `soulflow list` to see all run IDs

## What Next?

1. **Read README.md** - Complete documentation
2. **Check TEST_RESULTS.md** - See what works
3. **Read SKILL.md** - Learn about features
4. **Create workflows** - Build your own automation
5. **Contribute** - Add features, fix bugs

## Resources

- **Examples**: `examples/*.yaml`
- **Docs**: `README.md`
- **Tests**: `TEST_RESULTS.md`
- **Code**: `lib/*.js`

## Requirements

- Node.js v22.0.0+
- That's it! No other dependencies.

---

**Need help?** Check `soulflow help` or read README.md

**Ready to orchestrate!** 🚀
