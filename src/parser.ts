import * as yaml from 'js-yaml';
import { Tool, ParsedTool, SkipConfig } from './types';

/**
 * Regular expression to match skip YAML block at the end of tool descriptions
 */
const SKIP_YAML_REGEX = /\n\s*skip:\s*\n((?:\s+.+\n?)*)/;

/**
 * Parses a tool description to extract skip configuration
 */
export function parseToolDescription(description: string): { cleanDescription: string; skipConfig?: SkipConfig } {
  const match = description.match(SKIP_YAML_REGEX);

  if (!match) {
    return {
      cleanDescription: description.trim(),
      skipConfig: undefined
    };
  }

  const yamlContent = match[1];
  const cleanDescription = description.replace(match[0], '').trim();

  try {
    // Parse the YAML content
    const skipConfig = yaml.load(yamlContent) as SkipConfig;

    // Validate the structure
    if (typeof skipConfig !== 'object' || skipConfig === null) {
      throw new Error('Invalid skip configuration format');
    }

    return {
      cleanDescription,
      skipConfig
    };
  } catch (error) {
    console.warn(`Failed to parse skip configuration: ${error}`);
    return {
      cleanDescription,
      skipConfig: undefined
    };
  }
}

/**
 * Parses multiple tools and extracts their skip configurations
 */
export function parseTools(tools: Tool[]): ParsedTool[] {
  return tools.map(tool => {
    const { cleanDescription, skipConfig } = parseToolDescription(tool.description);

    return {
      ...tool,
      originalDescription: tool.description,
      cleanDescription,
      skip: skipConfig || tool.skip
    };
  });
}

/**
 * Validates that a skip configuration is properly formatted
 */
export function validateSkipConfig(config: any): config is SkipConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  if (config.depends_on && !Array.isArray(config.depends_on)) {
    return false;
  }

  if (config.keywords && !Array.isArray(config.keywords)) {
    return false;
  }

  return true;
}