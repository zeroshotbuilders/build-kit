# AI Agents

We have a custom package for making AI Agents that uses the OpenAI Agents SDK (`packages/agentic-workflows`).

## Agent Service

The core is an agent service (`packages/agentic-workflows/src/service/ai-agent-service.ts`) with multiple
implementations:

- `ai-agent-service-openai`: production implementation using the OpenAI API
- `ai-agent-service-local`: mocked implementation for testing non-AI portions of workflows (orchestration, task
  management, error handling, etc)
- `ai-agent-service-ollama`: hits a local ollama deployment for development/testing with local models

## Tools

Tools can be passed into `AgentConfig` to give agents access to external capabilities:

```ts
tools: [getWebContentTool({ tavilyService: this.tavilyService })],
```

Tool definitions live in `packages/tavily-utils/src/tools/`.

## Update Checklist

Every time you update an agent, you must also update:
- Any fixtures
- Any tests that assume a certain agent structure
