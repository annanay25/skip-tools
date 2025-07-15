# skip-tools

Skip is a Middleware for LLM tool filtering.

It can be used to reduce the number of tools passed to language models by using simple keyword-based filtering from conversation messages.

## Features

- 🎯 **Keyword Based Filtering**: Filter tools based on keywords from conversation messages, then automatically add dependencies
- 📝 **YAML Annotations**: Simple `skip:` configuration in tool descriptions
- 🧹 **Clean Descriptions**: Skip will automatically strip the yaml metadata before sending to LLM
- 🤖 **Universal LLM Support**: Works with any LLM provider (OpenAI, Anthropic, etc.) since it processes tools before sending to the LLM
- ⚡ **Incremental Processing**: Automatically track processed messages and optionally process only new messages for performance
- 🔗 **Dependency Management**: Automatically include tool dependencies after keyword filtering

## Installation

```bash
npm install skip-tools
```

## Quick Start

```typescript
import { SkipTools } from 'skip-tools';

// Sample tool set defined in your app with additional annotations added
const tools = [
  {
    name: 'read_file',
    description: `Read the contents of a file from the filesystem.

skip:
  keywords: ["read", "file", "contents", "view"]`
  }, // skip will look for these keywords in the message content
  {
    name: 'write_file',
    description: `Write content to a file on the filesystem.

skip:
  depends_on: ["read_file"]
  keywords: ["write", "save", "create", "file", "edit"]`
  }, // if a tool is selected, its dependencies will be selected as well
  {
    name: 'search_web',
    description: `Search the internet for information.

skip:
  keywords: ["search", "web", "internet", "lookup"]`
  }
];

// Create SkipTools object once with all tools
const skipTools = new SkipTools(tools);

// Filter tools using conversation messages
const messages = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi! How can I help?' },
  { role: 'user', content: 'I want to read a file' }
];

const result = skipTools.filter({
  messages,
  maxTools: 5
});

console.log(result.tools); // Only tools that match the criteria
console.log(result.messagesProcessed); // Number of messages processed
console.log(result.reason); // Human-readable filtering explanation

// For incremental processing in long conversations:
const newMessages = [
  ...messages,
  { role: 'assistant', content: 'I can help you read a file.' },
  { role: 'user', content: 'Now I also want to search the web' }
];

const incrementalResult = skipTools.filter({
  messages: newMessages,
  onlyNewMessages: true  // Only process the 2 new messages
});

console.log(incrementalResult.tools); // Tools matching new messages
console.log(incrementalResult.reason); // Shows "filtered by keywords from 2 new messages"
```

## YAML Configuration

Add a `skip:` section to your tool descriptions with the following fields:

### `depends_on` (optional)
List of other tools that this tool depends on. These tools will be automatically included when this tool is selected:

```yaml
skip:
  depends_on: ["read_file", "write_file"]
```

**Important**: Dependencies must reference other tools in the same tool list.

### `keywords` (optional)
Keywords that help match tools to user queries:

```yaml
skip:
  keywords: ["read", "file", "contents", "view", "open"]
```

> **Note**: This YAML configuration will be automatically parsed out before passing the tool to the LLM.

## API Reference

### `SkipTools`

```typescript
const skipTools = new SkipTools(tools);

// Filter tools based on conversation messages
const result = skipTools.filter({
  messages: Message[],
  maxTools?: number,
  onlyNewMessages?: boolean
});
```

**Key Methods:**
- `filter()` - Returns filtered tools with clean descriptions
- `getAllTools()` - Get all parsed tools
- `getCleanDescriptions()` - Get tool descriptions without skip YAML

### `FilterOptions`

- `messages`: Array of conversation messages to analyze
- `maxTools`: Maximum number of tools to return (optional)
- `onlyNewMessages`: If true, only process messages added since the last `filter()` call (optional, defaults to false)

## Example usage with OpenAI

```typescript
class ConversationManager {
  private skipTools: SkipTools;
  private messages: Message[] = [];

  constructor(tools: Tool[]) {
    this.skipTools = new SkipTools(tools);
  }

  async processUserMessage(userMessage: string) {
    // Add user message to conversation
    this.messages.push({ role: 'user', content: userMessage });

    // Filter tools based on only new messages (efficient for long conversations)
    const filtered = this.skipTools.filter({
      messages: this.messages,
      maxTools: 10,
      onlyNewMessages: true  // Only process new messages since last call
    });

    // Make OpenAI call with filtered tools
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: this.messages,
      tools: filtered.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.cleanDescription,
          parameters: yourParameters
        }
      }))
    });

    // Add assistant response to conversation
    this.messages.push(response.choices[0].message);

    console.log(`Processed ${filtered.messagesProcessed} total messages`);
    console.log(`Reason: ${filtered.reason}`);
  }
}
```

## Development

```bash
npm test                              # Run tests
OPENAI_API_KEY=<key> npm test          # Test with OpenAI
```

## TODO

[] Add NLP based filtering criteria
[] Add explicit support for categories (can be somewhat done today using dependencies)
[] Add metrics to track filtered tool calls


**License:**

MIT