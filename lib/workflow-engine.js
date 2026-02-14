import { readFileSync } from 'node:fs';

/**
 * WorkflowEngine - Parses and validates YAML workflow definitions
 */
export class WorkflowEngine {
  constructor() {
    this.agentTypes = ['planner', 'developer', 'verifier', 'tester', 'reviewer'];
  }

  /**
   * Load and parse a YAML workflow file
   */
  loadWorkflow(filePath) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const workflow = this.parseYaml(content);
      this.validateWorkflow(workflow);
      return workflow;
    } catch (error) {
      throw new Error(`Failed to load workflow: ${error.message}`);
    }
  }

  /**
   * Simple YAML parser (supports subset needed for workflows)
   */
  parseYaml(content) {
    const lines = content.split('\n');
    const root = {};
    const stack = [{ obj: root, indent: -1 }];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Skip comments and empty lines
      if (!line.trim() || line.trim().startsWith('#')) continue;
      
      const indent = line.match(/^ */)[0].length;
      const trimmed = line.trim();
      
      // Handle list items
      if (trimmed.startsWith('- ')) {
        const value = trimmed.substring(2);
        
        // Pop stack to correct level
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }
        
        const parent = stack[stack.length - 1].obj;
        
        if (value.includes(':')) {
          // Object in list
          const obj = {};
          const [key, val] = value.split(':').map(s => s.trim());
          if (val) {
            obj[key] = this.parseValue(val);
          }
          
          // Ensure parent is array
          const lastKey = stack[stack.length - 1].lastKey;
          if (lastKey && !Array.isArray(parent[lastKey])) {
            parent[lastKey] = [];
          }
          
          if (lastKey) {
            parent[lastKey].push(obj);
            stack.push({ obj, indent, isArrayItem: true });
          }
        } else {
          // Simple list item
          const lastKey = stack[stack.length - 1].lastKey;
          if (lastKey) {
            if (!Array.isArray(parent[lastKey])) {
              parent[lastKey] = [];
            }
            parent[lastKey].push(this.parseValue(value));
          }
        }
      }
      // Handle key-value pairs
      else if (trimmed.includes(':')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        
        // Pop stack to correct level
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }
        
        const parent = stack[stack.length - 1].obj;
        
        if (value) {
          // Inline value
          parent[key] = this.parseValue(value);
        } else {
          // Object or array follows
          if (stack[stack.length - 1].isArrayItem) {
            // Adding property to array item
            parent[key] = null;
            stack[stack.length - 1].lastKey = key;
          } else {
            parent[key] = null;
            stack.push({ obj: parent, indent, lastKey: key });
          }
        }
      }
    }
    
    return root;
  }

  parseValue(value) {
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // Parse numbers
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    
    // Parse booleans
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    
    return value;
  }

  /**
   * Validate workflow structure
   */
  validateWorkflow(workflow) {
    if (!workflow.name) {
      throw new Error('Workflow must have a name');
    }

    if (!workflow.steps || !Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      
      if (!step.name) {
        throw new Error(`Step ${i} must have a name`);
      }

      if (!step.agent) {
        throw new Error(`Step "${step.name}" must specify an agent type`);
      }

      if (!this.agentTypes.includes(step.agent)) {
        throw new Error(`Step "${step.name}" has invalid agent type "${step.agent}". Must be one of: ${this.agentTypes.join(', ')}`);
      }

      if (!step.task) {
        throw new Error(`Step "${step.name}" must have a task description`);
      }

      // Validate retry config
      if (step.retry !== undefined && typeof step.retry !== 'number') {
        throw new Error(`Step "${step.name}" retry must be a number`);
      }

      // Validate escalation
      if (step.escalate_to && !this.agentTypes.includes(step.escalate_to)) {
        throw new Error(`Step "${step.name}" has invalid escalate_to agent type "${step.escalate_to}"`);
      }

      // Validate verification
      if (step.verify_with && !this.agentTypes.includes(step.verify_with)) {
        throw new Error(`Step "${step.name}" has invalid verify_with agent type "${step.verify_with}"`);
      }
    }

    return true;
  }

  /**
   * Get workflow metadata
   */
  getWorkflowInfo(workflow) {
    return {
      name: workflow.name,
      description: workflow.description || '',
      stepCount: workflow.steps.length,
      agents: [...new Set(workflow.steps.map(s => s.agent))],
      hasVerification: workflow.steps.some(s => s.verify_with),
      hasEscalation: workflow.steps.some(s => s.escalate_to)
    };
  }
}
