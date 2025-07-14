import { SkipTools } from '../src/index';
import { Tool } from '../src/types';

describe('Dependency Validation', () => {

  it('should validate dependencies during initialization', () => {
    const validTools: Tool[] = [
      {
        name: 'base_tool',
        description: `A base tool with no dependencies.

skip:
  keywords: ["base"]`
      },
      {
        name: 'dependent_tool',
        description: `A tool that depends on base_tool.

skip:
  depends_on: ["base_tool"]
  keywords: ["dependent"]`
      }
    ];

    // Should not throw an error
    expect(() => new SkipTools(validTools)).not.toThrow();
  });

  it('should throw error for invalid dependencies', () => {
    const invalidTools: Tool[] = [
      {
        name: 'bad_tool',
        description: `A tool with invalid dependency.

skip:
  depends_on: ["non_existent_tool"]
  keywords: ["bad"]`
      }
    ];

    expect(() => new SkipTools(invalidTools)).toThrow(
      'Tool "bad_tool" depends on "non_existent_tool" which is not found in the provided tools list. Dependencies must reference other tools in the same list.'
    );
  });

  it('should throw error for multiple invalid dependencies', () => {
    const invalidTools: Tool[] = [
      {
        name: 'good_tool',
        description: `A valid tool.

skip:
  keywords: ["good"]`
      },
      {
        name: 'bad_tool',
        description: `A tool with invalid dependencies.

skip:
  depends_on: ["non_existent_tool", "another_missing_tool"]
  keywords: ["bad"]`
      }
    ];

    expect(() => new SkipTools(invalidTools)).toThrow(
      'Tool "bad_tool" depends on "non_existent_tool" which is not found in the provided tools list. Dependencies must reference other tools in the same list.'
    );
  });

    it('should include dependencies when filtering', () => {
    const tools: Tool[] = [
      {
        name: 'base_tool',
        description: `A base tool with no dependencies.

skip:
  keywords: ["base"]`
      },
      {
        name: 'dependent_tool',
        description: `A tool that depends on base_tool.

skip:
  depends_on: ["base_tool"]
  keywords: ["dependent"]`
      },
      {
        name: 'unrelated_tool',
        description: `An unrelated tool.

skip:
  keywords: ["unrelated", "separate"]`
      }
    ];

    const skipTools = new SkipTools(tools);

    // Filter for dependent_tool with specific keywords
    const result = skipTools.filter({
      messages: [{ role: 'user', content: 'I need the dependent functionality' }]
    });

    // Should include both dependent_tool (matched by keywords) and base_tool (its dependency)
    const toolNames = result.tools.map(t => t.name);
    expect(toolNames).toContain('dependent_tool');
    expect(toolNames).toContain('base_tool');

    // Should not include unrelated_tool since it doesn't match keywords and isn't a dependency
    expect(toolNames).not.toContain('unrelated_tool');
  });

    it('should handle direct dependencies only (not transitive)', () => {
    const tools: Tool[] = [
      {
        name: 'level1_tool',
        description: `Level 1 tool.

skip:
  keywords: ["unique_level1"]`
      },
      {
        name: 'level2_tool',
        description: `Level 2 tool depends on level1.

skip:
  depends_on: ["level1_tool"]
  keywords: ["unique_level2"]`
      },
      {
        name: 'level3_tool',
        description: `Level 3 tool depends on level2.

skip:
  depends_on: ["level2_tool"]
  keywords: ["level3"]`
      }
    ];

    const skipTools = new SkipTools(tools);

    // Filter for level3_tool
    const result = skipTools.filter({
      messages: [{ role: 'user', content: 'I need level3 functionality' }]
    });

    // Should include level3_tool (matched by keywords) and level2_tool (its dependency)
    // but NOT level1_tool (since level2_tool depends on it but we don't recursively resolve)
    const toolNames = result.tools.map(t => t.name);
    expect(toolNames).toContain('level3_tool');
    expect(toolNames).toContain('level2_tool');

    // Current implementation doesn't do recursive dependency resolution
    // This test documents the current behavior
    expect(toolNames).not.toContain('level1_tool');
  });

  it('should handle multiple dependencies', () => {
    const tools: Tool[] = [
      {
        name: 'dep1_tool',
        description: `Dependency 1.

skip:
  keywords: ["dep1"]`
      },
      {
        name: 'dep2_tool',
        description: `Dependency 2.

skip:
  keywords: ["dep2"]`
      },
      {
        name: 'multi_dependent_tool',
        description: `Tool with multiple dependencies.

skip:
  depends_on: ["dep1_tool", "dep2_tool"]
  keywords: ["multi"]`
      }
    ];

    const skipTools = new SkipTools(tools);

    // Filter for multi_dependent_tool
    const result = skipTools.filter({
      messages: [{ role: 'user', content: 'I need multi functionality' }]
    });

    // Should include all tools: multi_dependent_tool (matched) and both dependencies
    const toolNames = result.tools.map(t => t.name);
    expect(toolNames).toContain('multi_dependent_tool');
    expect(toolNames).toContain('dep1_tool');
    expect(toolNames).toContain('dep2_tool');
    expect(toolNames).toHaveLength(3);
  });

  it('should handle circular dependencies gracefully', () => {
    const tools: Tool[] = [
      {
        name: 'tool_a',
        description: `Tool A depends on Tool B.

skip:
  depends_on: ["tool_b"]
  keywords: ["tool_a"]`
      },
      {
        name: 'tool_b',
        description: `Tool B depends on Tool A.

skip:
  depends_on: ["tool_a"]
  keywords: ["tool_b"]`
      }
    ];

    // Should not throw during initialization (circular deps are allowed)
    expect(() => new SkipTools(tools)).not.toThrow();

    const skipTools = new SkipTools(tools);

    // Filter for tool_a
    const result = skipTools.filter({
      messages: [{ role: 'user', content: 'I need tool_a functionality' }]
    });

    // Should include both tools due to circular dependency
    const toolNames = result.tools.map(t => t.name);
    expect(toolNames).toContain('tool_a');
    expect(toolNames).toContain('tool_b');
    expect(toolNames).toHaveLength(2);
  });

    it('should preserve tool order after adding dependencies', () => {
    const tools: Tool[] = [
      {
        name: 'first_tool',
        description: `First tool.

skip:
  keywords: ["unique_first"]`
      },
      {
        name: 'second_tool',
        description: `Second tool depends on first.

skip:
  depends_on: ["first_tool"]
  keywords: ["second"]`
      },
      {
        name: 'third_tool',
        description: `Third tool.

skip:
  keywords: ["unique_third"]`
      }
    ];

    const skipTools = new SkipTools(tools);

    // Filter for second_tool specifically
    const result = skipTools.filter({
      messages: [{ role: 'user', content: 'I need second functionality' }]
    });

    // Should preserve the original order: first_tool comes before second_tool
    const toolNames = result.tools.map(t => t.name);
    const firstIndex = toolNames.indexOf('first_tool');
    const secondIndex = toolNames.indexOf('second_tool');

    expect(firstIndex).toBeLessThan(secondIndex);
    expect(toolNames).toContain('first_tool'); // dependency
    expect(toolNames).toContain('second_tool'); // matched by keyword
    expect(toolNames).not.toContain('third_tool'); // not matched and not a dependency
  });
});