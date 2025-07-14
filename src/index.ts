import { Tool, ParsedTool, FilterOptions, FilterResult, Message } from './types';
import { parseTools } from './parser';

/**
 * Main class for filtering tools based on skip configurations
 */
export class SkipTools {
  private parsedTools: ParsedTool[] = [];
  private lastProcessedMessageCount = 0;

  /**
   * Initialize with a list of tools
   */
  constructor(tools: Tool[]) {
    this.parsedTools = parseTools(tools);
    this.validateDependencies();
  }

  /**
   * Validate that all dependencies reference existing tools
   */
  private validateDependencies(): void {
    const toolNames = new Set(this.parsedTools.map(tool => tool.name));

    this.parsedTools.forEach(tool => {
      if (tool.skip?.depends_on) {
        tool.skip.depends_on.forEach(depName => {
          if (!toolNames.has(depName)) {
            throw new Error(`Tool "${tool.name}" depends on "${depName}" which is not found in the provided tools list. Dependencies must reference other tools in the same list.`);
          }
        });
      }
    });
  }

  /**
   * Filter tools based on the provided options
   */
  filter(options: FilterOptions): FilterResult {
    const { messages, maxTools, onlyNewMessages = false } = options;

    let filteredTools = [...this.parsedTools];

    // Extract query from messages for filtering
    const extractedQuery = this.extractQueryFromMessages(messages, onlyNewMessages);

    // Update internal tracking
    this.lastProcessedMessageCount = messages.length;

    // Filter by keywords if query is provided
    if (extractedQuery.query) {
      filteredTools = this.filterByKeywords(filteredTools, extractedQuery.query);
    }

    // Add dependencies for filtered tools
    filteredTools = this.addDependencies(filteredTools);

    // Limit the number of tools
    if (maxTools && filteredTools.length > maxTools) {
      filteredTools = filteredTools.slice(0, maxTools);
    }

    return {
      tools: filteredTools,
      totalOriginalCount: this.parsedTools.length,
      filteredCount: filteredTools.length,
      reason: this.generateFilterReason(options, filteredTools.length),
      messagesProcessed: extractedQuery.messagesProcessed
    };
  }

  /**
   * Extract query text from an array of messages
   */
  private extractQueryFromMessages(messages: Message[], onlyNewMessages: boolean): { query: string; messagesProcessed: number } {
    // Determine which messages to process
    // If onlyNewMessages is true, only process messages added since the last call
    const messagesToProcess = onlyNewMessages
      ? messages.slice(this.lastProcessedMessageCount)
      : messages;

    // Filter out tool calls and tool responses, only keep user/assistant messages without tool_calls
    const nonToolMessages = messagesToProcess.filter(msg => {
      // Skip tool response messages
      if (msg.role === 'tool') {
        return false;
      }

      // Skip assistant messages that contain tool calls
      if (msg.role === 'assistant' && 'tool_calls' in msg && msg.tool_calls) {
        return false;
      }

      // Include user messages and assistant messages without tool calls
      return true;
    });

    // Extract content from messages, handling both string and array content types
    const textContent = nonToolMessages
      .filter(msg => msg.content)
      .map(msg => this.extractTextFromContent(msg.content))
      .filter(text => text && text.trim().length > 0)
      .map(text => text!.trim())
      .join(' ');

    return {
      query: textContent || '', // Ensure we always return a string
      messagesProcessed: messages.length // Return total count of messages processed (including previously processed ones)
    };
  }

  /**
   * Extract text content from OpenAI message content (handles both string and array types)
   */
  private extractTextFromContent(content: any): string | null {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      // Handle array of content parts (for multi-modal messages)
      return content
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join(' ');
    }

    return null;
  }



    /**
   * Add dependencies for filtered tools
   * For each tool in the filtered list, add any tools it depends on
   */
  private addDependencies(filteredTools: ParsedTool[]): ParsedTool[] {
    const resultTools = new Set<string>();

    // Add all filtered tools to the result
    filteredTools.forEach(tool => {
      resultTools.add(tool.name);
    });

    // Add dependencies for each filtered tool
    filteredTools.forEach(tool => {
      if (tool.skip?.depends_on) {
        tool.skip.depends_on.forEach(depName => {
          resultTools.add(depName);
        });
      }
    });

    // Return the tools in the same order as the original parsed tools
    return this.parsedTools.filter(tool => resultTools.has(tool.name));
  }

  /**
   * Filter tools based on keyword matching
   * - Tools without skip configuration are ALWAYS included
   * - Tools with keywords use OR logic: if ANY keyword matches, include the tool
   */
  private filterByKeywords(tools: ParsedTool[], query: string): ParsedTool[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2); // Filter out short words

    return tools.filter(tool => {
      // Rule 1: Always include tools without skip configuration
      if (!tool.skip?.keywords || tool.skip.keywords.length === 0) {
        return true;
      }

      // Rule 2: For tools with keywords, use OR logic - if ANY keyword matches, include the tool
      return tool.skip.keywords.some(keyword => {
        const keywordLower = keyword.toLowerCase();

        // Exact match: check if keyword appears anywhere in the query
        if (queryLower.includes(keywordLower)) {
          return true;
        }

        // Word-based matching: check if any word in the query matches the keyword
        // Only consider words longer than 2 characters and use more strict matching
        return queryWords.some(word => {
          // Check if the word is a substantial part of the keyword or vice versa
          return word.length > 2 && (
            keywordLower.includes(word) ||
            word.includes(keywordLower) ||
            keywordLower.startsWith(word) ||
            word.startsWith(keywordLower)
          );
        });
      });
    });
  }

  /**
   * Generate a human-readable reason for the filtering result
   */
  private generateFilterReason(options: FilterOptions, resultCount: number): string {
    const reasons = [];

    if (options.messages && options.messages.length > 0) {
      const messageScope = options.onlyNewMessages ? 'new' : 'all';
      const messageCount = options.onlyNewMessages
        ? Math.max(0, options.messages.length - this.lastProcessedMessageCount)
        : options.messages.length;
      reasons.push(`filtered by keywords from ${messageCount} ${messageScope} messages, dependencies added`);
    }

    if (options.maxTools && resultCount === options.maxTools) {
      reasons.push(`limited to ${options.maxTools} tools`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'no filters applied';
  }

  /**
   * Get all parsed tools
   */
  getAllTools(): ParsedTool[] {
    return [...this.parsedTools];
  }

  /**
   * Get clean descriptions (without skip YAML) for all tools
   */
  getCleanDescriptions(): { name: string; description: string }[] {
    return this.parsedTools.map(tool => ({
      name: tool.name,
      description: tool.cleanDescription
    }));
  }
}

// Export types and functions for direct usage
export * from './types';
export * from './parser';

// Default export for convenience
export default SkipTools;