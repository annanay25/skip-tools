import { SkipTools } from './src/index';
import { Message } from './src/types';

// Example tools with skip configurations
const exampleTools = [
  {
    name: 'read_file',
    description: `Read the contents of a file from the filesystem.

This tool allows you to read the contents of any file
that exists in the current workspace.

skip:
  keywords: ["read", "file", "contents", "view", "open", "show"]`
  },
  {
    name: 'write_file',
    description: `Write content to a file on the filesystem.

This tool allows you to create new files or overwrite
existing files with new content.

skip:
  depends_on: ["read_file"]
  keywords: ["write", "save", "create", "file", "edit"]`
  },
  {
    name: 'search_web',
    description: `Search the internet for information.

This tool uses a web search engine to find information
about any topic you specify.

skip:
  keywords: ["search", "web", "internet", "lookup", "find", "google"]`
  },
  {
    name: 'run_command',
    description: `Execute a command in the terminal.

This tool allows you to run shell commands and see their output.
Use with caution as it can modify your system.

skip:
  keywords: ["run", "execute", "command", "terminal", "bash", "shell"]`
  },
  {
    name: 'get_weather',
    description: `Get current weather information for a location.

This tool fetches real-time weather data for any city
or location you specify.

skip:
  keywords: ["weather", "temperature", "forecast", "climate", "rain"]`
  }
];

function demonstrateFiltering() {
  const skipTools = new SkipTools(exampleTools);

  console.log('=== Skip-Tools Demo (Simplified API) ===\n');

  // Explanation of the new simplified approach
  console.log('🚀 New Simplified API:');
  console.log('   • Tools provided to constructor are the available tools');
  console.log('   • Filter function only takes messages, maxTools, and recentMessageCount');
  console.log('   • Tools are filtered by keywords first, then dependencies are added');
  console.log('   • Filtering based on keywords from conversation messages, with dependencies included automatically\n');

  // Example 1: Basic message filtering
  console.log('1. Basic message filtering:');
  const messages1: Message[] = [
    { role: 'user', content: 'I want to read a file' }
  ];
  const result1 = skipTools.filter({
    messages: messages1
  });
  console.log(`   Messages processed: ${result1.messagesProcessed}`);
  console.log(`   Filtered tools: ${result1.tools.map(t => t.name).join(', ')}`);
  console.log(`   Reason: ${result1.reason}\n`);

  // Example 2: Keyword filtering for file operations
  console.log('2. Keyword filtering for file operations:');
  const messages2: Message[] = [
    { role: 'user', content: 'I want to read and write files' }
  ];
  const result2 = skipTools.filter({
    messages: messages2
  });
  console.log(`   Messages processed: ${result2.messagesProcessed}`);
  console.log(`   Filtered tools: ${result2.tools.map(t => t.name).join(', ')}`);
  console.log(`   Reason: ${result2.reason}\n`);

  // Example 3: Multiple message filtering
  console.log('3. Multiple message filtering:');
  const messages3: Message[] = [
    { role: 'user', content: 'Hello, I need help with something' },
    { role: 'assistant', content: 'Sure! What can I help you with?' },
    { role: 'user', content: 'I want to search for weather information and maybe run a command' }
  ];
  const result3 = skipTools.filter({
    messages: messages3
  });
  console.log(`   Messages processed: ${result3.messagesProcessed}`);
  console.log(`   Filtered tools: ${result3.tools.map(t => t.name).join(', ')}`);
  console.log(`   Reason: ${result3.reason}\n`);

  // Example 4: Recent messages only
  console.log('4. Recent messages only (last 2 messages):');
  const messages4: Message[] = [
    { role: 'user', content: 'Old message about files' },
    { role: 'assistant', content: 'I can help with files' },
    { role: 'user', content: 'Actually, I need weather info now' },
    { role: 'assistant', content: 'I can check the weather' }
  ];
  const result4 = skipTools.filter({
    messages: messages4,
    onlyNewMessages: true
  });
  console.log(`   Messages processed: ${result4.messagesProcessed}`);
  console.log(`   Filtered tools: ${result4.tools.map(t => t.name).join(', ')}`);
  console.log(`   Reason: ${result4.reason}\n`);

  // Example 5: Combined keyword filtering with dependencies and limit
  console.log('5. Combined keyword filtering with dependencies and limit:');
  const messages5: Message[] = [
    { role: 'user', content: 'I need to read files and search the web' }
  ];
  const result5 = skipTools.filter({
    messages: messages5,
    maxTools: 2
  });
  console.log(`   Messages processed: ${result5.messagesProcessed}`);
  console.log(`   Filtered tools: ${result5.tools.map(t => t.name).join(', ')}`);
  console.log(`   Reason: ${result5.reason}\n`);

  // Example 6: Empty messages (returns all tools)
  console.log('6. Empty messages (returns all tools):');
  const result6 = skipTools.filter({
    messages: []
  });
  console.log(`   Messages processed: ${result6.messagesProcessed}`);
  console.log(`   Filtered tools: ${result6.tools.map(t => t.name).join(', ')}`);
  console.log(`   Reason: ${result6.reason}\n`);

  // Example 7: Token savings demonstration
  console.log('7. Token savings demonstration:');
  const originalTokens = exampleTools.reduce((acc, tool) => acc + tool.description.length, 0);
  const cleanTokens = result3.tools.reduce((acc, tool) => acc + tool.cleanDescription.length, 0);
  const tokensSaved = originalTokens - cleanTokens;

  console.log(`   Original total characters: ${originalTokens}`);
  console.log(`   Clean descriptions total: ${cleanTokens}`);
  console.log(`   Characters saved: ${tokensSaved}`);
  console.log(`   Reduction: ${((tokensSaved / originalTokens) * 100).toFixed(1)}%\n`);

  // Example 8: Show clean descriptions
  console.log('8. Clean descriptions (ready for LLM):');
  const cleanDescriptions = result3.tools.map(tool => ({
    name: tool.name,
    description: tool.cleanDescription
  }));

  cleanDescriptions.forEach(tool => {
    console.log(`   ${tool.name}: ${tool.description.substring(0, 50)}...`);
  });

  console.log('\n=== Demo Complete ===');
}

// Run the demo
demonstrateFiltering();