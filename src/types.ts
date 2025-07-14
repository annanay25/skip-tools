import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Re-export OpenAI's official message types for better compatibility
 */
export type Message = ChatCompletionMessageParam;

/**
 * Configuration for tool filtering behavior
 */
export interface SkipConfig {
  depends_on?: string[];
  keywords?: string[];
}

/**
 * A tool definition with its description and skip configuration
 */
export interface Tool {
  name: string;
  description: string;
  skip?: SkipConfig;
}

/**
 * A tool with its original description and parsed skip config
 */
export interface ParsedTool extends Tool {
  originalDescription: string;
  cleanDescription: string;
}

/**
 * Options for filtering tools
 */
export interface FilterOptions {
  /** Array of conversation messages to analyze for tool selection */
  messages: Message[];
  /** Maximum number of tools to return */
  maxTools?: number;
  /** If true, only process messages added since the last filter call (defaults to false - processes all messages) */
  onlyNewMessages?: boolean;
}

/**
 * Result of tool filtering
 */
export interface FilterResult {
  /** Tools that were selected for the LLM */
  tools: ParsedTool[];
  /** Total number of tools before filtering */
  totalOriginalCount: number;
  /** Number of tools after filtering */
  filteredCount: number;
  /** Human-readable reason for the filtering result */
  reason: string;
  /** Number of messages that were processed for filtering */
  messagesProcessed: number;
}