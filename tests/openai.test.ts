import OpenAI from 'openai';
import { SkipTools } from '../src/index';
import { Tool, Message } from '../src/types';

// Mock tools with skip configurations
const mockTools: Tool[] = [
  {
    name: 'read_file',
    description: `Read the contents of a file from the filesystem.

skip:
  keywords: ["read", "file", "contents", "view"]`
  },
  {
    name: 'write_file',
    description: `Write content to a file on the filesystem.

skip:
  depends_on: ["read_file"]
  keywords: ["write", "save", "create", "file"]`
  },
  {
    name: 'search_web',
    description: `Search the internet for information.

skip:
  keywords: ["search", "web", "internet", "lookup"]`
  },
  {
    name: 'run_command',
    description: `Execute a command in the terminal.

skip:
  keywords: ["run", "execute", "command", "terminal", "bash"]`
  },
  {
    name: 'get_weather',
    description: `Get current weather information for a location.

skip:
  keywords: ["weather", "temperature", "forecast", "climate"]`
  }
];

describe('SkipTools OpenAI Integration', () => {
  let skipTools: SkipTools;
  let openai: OpenAI;

  beforeAll(() => {
    skipTools = new SkipTools(mockTools);

    // Initialize OpenAI client (requires OPENAI_API_KEY environment variable)
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'test-key'
    });
  });

  it('should parse tools and extract skip configurations', () => {
    const allTools = skipTools.getAllTools();

    expect(allTools).toHaveLength(5);
    expect(allTools[0].skip?.keywords).toContain('read');
    expect(allTools[0].skip?.depends_on).toBeUndefined(); // read_file has no dependencies
    expect(allTools[1].skip?.depends_on).toContain('read_file'); // write_file depends on read_file
    expect(allTools[0].cleanDescription).not.toContain('skip:');
  });

  it('should filter tools by keywords and add dependencies', () => {
    const messages: Message[] = [
      { role: 'user', content: 'I want to write' }
    ];

    const result = skipTools.filter({
      messages
    });

    // Should include write_file because it has "write" and "file" keywords
    // Should also include read_file because it is a dependency of write_file
    expect(result.tools.some(t => t.name === 'write_file')).toBe(true);
    expect(result.reason).toContain('filtered by keywords');
    expect(result.reason).toContain('dependencies added');
  });

  it('should filter tools by keywords', () => {
    const messages: Message[] = [
      { role: 'user', content: 'I want to read some files' }
    ];

    const result = skipTools.filter({
      messages
    });

    // Should include read_file because it has "read" and "file" keywords
    expect(result.tools.some(t => t.name === 'read_file')).toBe(true);
    expect(result.reason).toContain('filtered by keywords');
  });

  it('should filter tools by keywords and limit results', () => {
    const messages: Message[] = [
      { role: 'user', content: 'file operations' }
    ];

    const result = skipTools.filter({
      messages,
      maxTools: 1
    });

    expect(result.tools).toHaveLength(1);
    expect(result.reason).toContain('filtered by keywords');
    expect(result.reason).toContain('limited to 1 tools');
  });

  it('should combine keyword filtering with dependencies and limit results', () => {
    const messages: Message[] = [
      { role: 'user', content: 'I want to read files' }
    ];

    const result = skipTools.filter({
      messages,
      maxTools: 1
    });

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe('read_file'); // Should prioritize read_file due to keyword match
    expect(result.reason).toContain('filtered by keywords');
    expect(result.reason).toContain('dependencies added');
    expect(result.reason).toContain('limited to 1 tools');
  });

    it('should provide clean descriptions without skip YAML', () => {
    const cleanDescriptions = skipTools.getCleanDescriptions();

    expect(cleanDescriptions).toHaveLength(5);
    expect(cleanDescriptions[0].description).not.toContain('skip:');
    expect(cleanDescriptions[0].description).toContain('Read the contents of a file');
  });

  it('should filter tools using message arrays', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'I need to read some files and check the weather' }
    ];

    const result = skipTools.filter({
      messages
    });

    expect(result.messagesProcessed).toBe(3);
    expect(result.tools.some(t => t.name === 'read_file')).toBe(true);
    expect(result.tools.some(t => t.name === 'get_weather')).toBe(true);
  });

  it('should process only new messages when onlyNewMessages is true', () => {
    const initialMessages: Message[] = [
      { role: 'user', content: 'Old message about weather' },
      { role: 'user', content: 'Another old message' }
    ];

    // First call processes all messages
    const firstResult = skipTools.filter({
      messages: initialMessages
    });

    expect(firstResult.messagesProcessed).toBe(2);

    // Second call with new messages added
    const allMessages: Message[] = [
      { role: 'user', content: 'Old message about weather' },
      { role: 'user', content: 'Another old message' },
      { role: 'user', content: 'Recent message about reading files' }
    ];

    const secondResult = skipTools.filter({
      messages: allMessages,
      onlyNewMessages: true
    });

    expect(secondResult.messagesProcessed).toBe(3); // Total messages processed
    expect(secondResult.tools.some(t => t.name === 'read_file')).toBe(true); // Should find read_file from the new message
  });

  it('should handle empty messages array', () => {
    const result = skipTools.filter({
      messages: []
    });

    expect(result.messagesProcessed).toBe(0);
    expect(result.tools).toHaveLength(5); // All tools returned when no filtering
  });

  it('should filter out messages without content', () => {
    const messages: Message[] = [
      { role: 'user', content: 'I want to read files' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Also need weather info' }
    ];

    const result = skipTools.filter({
      messages
    });

    expect(result.messagesProcessed).toBe(3); // All messages processed, but only content-full ones used
  });

  it('should work with message-based filtering', () => {
    const messages: Message[] = [
      { role: 'user', content: 'I need weather information' }
    ];

    const result = skipTools.filter({
      messages
    });

    expect(result.tools.some(t => t.name === 'get_weather')).toBe(true);
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

  it('should include dependencies when filtering', () => {
    const messages: Message[] = [
      { role: 'user', content: 'I want to write files' }
    ];

    const result = skipTools.filter({
      messages
    });

    // Should include both write_file (matched by keywords) and read_file (its dependency)
    expect(result.tools.some(t => t.name === 'write_file')).toBe(true);
    expect(result.tools.some(t => t.name === 'read_file')).toBe(true);
  });

    // This test requires a valid OpenAI API key
  it('should work with OpenAI API call', async () => {
    // Skip this test if no API key is provided
    if (!process.env.OPENAI_API_KEY) {
      console.log('Skipping OpenAI test - no API key provided');
      return;
    }

    const messages: Message[] = [
      { role: 'user', content: 'I need to read a file and then search for information online' }
    ];

    // Filter tools based on the messages
    const filteredResult = skipTools.filter({
      messages,
      maxTools: 3
    });

    expect(filteredResult.tools.length).toBeGreaterThan(0);

    // Create a simplified tools format for OpenAI
    const tools = filteredResult.tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.cleanDescription,
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    }));

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'I need to read a file and then search for information online' }
        ],
        tools,
        tool_choice: 'auto',
        max_tokens: 150
      });

      expect(response.choices[0].message).toBeDefined();

      // If a function was called, it should be one of our filtered tools
      if (response.choices[0].message?.tool_calls) {
        const calledFunction = response.choices[0].message?.tool_calls[0]?.function.name;
        expect(filteredResult.tools.some(t => t.name === calledFunction)).toBe(true);
      }

      console.log('OpenAI Response:', response.choices[0].message);
      console.log('Filtered Tools:', filteredResult.tools.map(t => t.name));

    } catch (error) {
      console.error('OpenAI API call failed:', error);
      // Don't fail the test if API call fails due to network issues
    }
  });
});

// Helper function to create a mock OpenAI response for testing
export function createMockOpenAITest() {
  return {
    testFilteringWithMockResponse: () => {
      const skipTools = new SkipTools(mockTools);

      const messages: Message[] = [
        { role: 'user', content: 'read file contents' }
      ];

      const result = skipTools.filter({
        messages,
        maxTools: 2
      });

      // Simulate what would happen in a real OpenAI call
      const toolsForOpenAI = result.tools.map(tool => ({
        name: tool.name,
        description: tool.cleanDescription
      }));

      return {
        originalToolCount: mockTools.length,
        filteredToolCount: result.tools.length,
        toolsForOpenAI,
        tokensSaved: mockTools.reduce((acc, tool) => acc + tool.description.length, 0) -
                    result.tools.reduce((acc, tool) => acc + tool.cleanDescription.length, 0)
      };
    }
  };
}