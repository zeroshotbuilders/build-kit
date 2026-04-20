import {
  AgentConfig,
  AgentRunConfig,
  AgentRunResult,
  AiAgentService,
  AgentType
} from "./ai-agent-service";

/**
 * Local/mock implementation of AiAgentService for testing.
 * Follows the pattern of OpenaiServiceLocal and TavilyServiceLocal.
 *
 * Usage in tests:
 * ```typescript
 * // Mock Phase 1: Link Extraction
 * AiAgentServiceLocal.setResponse("ProgramNextStepsAgent:extractLinks", {
 *   links: ["https://example.com/apply"]
 * });
 *
 * // Mock Phase 2: Link Summaries (multiple responses for loops)
 * AiAgentServiceLocal.setResponses("ProgramNextStepsAgent:summarizeLink", [
 *   "Summary for first link",
 *   "Summary for second link"
 * ]);
 *
 * // Mock errors
 * AiAgentServiceLocal.setError("ProgramNextStepsAgent:searchWeb", "Failed to fetch");
 *
 * // Cleanup
 * AiAgentServiceLocal.clearResponses();
 * AiAgentServiceLocal.clearErrors();
 * ```
 */
export class AiAgentServiceLocal implements AiAgentService {
  private static instance: AiAgentServiceLocal = new AiAgentServiceLocal();
  private static responsesByAgentName: Map<string, any[]> = new Map();
  private static lastResponseByAgentName: Map<string, any> = new Map();
  private static errorsByAgentName: Map<string, string> = new Map();
  private static mockWorkingDir: string | undefined;

  public static getInstance(): AiAgentServiceLocal {
    return AiAgentServiceLocal.instance;
  }

  /**
   * Set a single response for an agent.
   * If called multiple times for the same agent, responses will be queued.
   */
  public static setResponse<T>(agentName: string, output: T): void {
    const existing = this.responsesByAgentName.get(agentName) || [];
    existing.push(output);
    this.responsesByAgentName.set(agentName, existing);
  }

  /**
   * Set multiple responses for an agent (useful for agents called in loops).
   * Responses will be returned in order, one per call.
   */
  public static setResponses<T>(agentName: string, outputs: T[]): void {
    const existing = this.responsesByAgentName.get(agentName) || [];
    existing.push(...outputs);
    this.responsesByAgentName.set(agentName, existing);
  }

  /**
   * Set a mock working directory to return with successful responses.
   * Used to test flows where the caller needs a workingDir (e.g., Codex CLI agent).
   */
  public static setMockWorkingDir(dir: string | undefined): void {
    this.mockWorkingDir = dir;
  }

  /**
   * Set an error message for an agent.
   * When this agent is called, it will return a failed result with this error.
   */
  public static setError(agentName: string, errorMessage: string): void {
    this.errorsByAgentName.set(agentName, errorMessage);
  }

  /**
   * Clear all response overrides
   */
  public static clearResponses(): void {
    this.responsesByAgentName.clear();
    this.lastResponseByAgentName.clear();
  }

  /**
   * Clear all error overrides
   */
  public static clearErrors(): void {
    this.errorsByAgentName.clear();
  }

  /**
   * Clear all overrides (both responses and errors)
   */
  public static clearAllOverrides(): void {
    this.responsesByAgentName.clear();
    this.lastResponseByAgentName.clear();
    this.errorsByAgentName.clear();
    this.mockWorkingDir = undefined;
  }

  /**
   * Creates a mock agent. In local mode, we don't actually create real agents,
   * but we return a placeholder that can be used with runAgent.
   */
  createAgent<T>(config: AgentConfig<T>): AgentType<T> {
    // Return a mock agent object that contains the config
    // This is just a placeholder since we don't actually use it in local mode
    return { config } as unknown as AgentType<T>;
  }

  /**
   * Runs a mock agent. Returns the next queued response for the agent's name,
   * or an error if one is configured, or a default response.
   */
  async runAgent<T>(
    agent: AgentType<T>,
    config: AgentRunConfig
  ): Promise<AgentRunResult<T>> {
    const agentConfig = (agent as any).config as AgentConfig<T>;
    return this.executeAgent(agentConfig, config);
  }

  /**
   * Convenience method to create and run an agent in one call.
   * This is the primary method used in production code.
   */
  async createAndRun<T>(
    agentConfig: AgentConfig<T>,
    runConfig: AgentRunConfig
  ): Promise<AgentRunResult<T>> {
    return this.executeAgent(agentConfig, runConfig);
  }

  /**
   * Internal method that handles the actual mock execution logic
   */
  private async executeAgent<T>(
    agentConfig: AgentConfig<T>,
    runConfig: AgentRunConfig
  ): Promise<AgentRunResult<T>> {
    const result = await this.getAgentResult(agentConfig);

    if (runConfig.session && result.success) {
      await runConfig.session.addItems([
        { role: "user", content: runConfig.input },
        {
          role: "assistant",
          content:
            typeof result.output === "string"
              ? result.output
              : JSON.stringify(result.output)
        }
      ]);
    }

    return result;
  }

  private async getAgentResult<T>(
    agentConfig: AgentConfig<T>
  ): Promise<AgentRunResult<T>> {
    // Check for error override
    const error = AiAgentServiceLocal.errorsByAgentName.get(agentConfig.name);
    if (error) {
      return {
        success: false,
        error,
        output: undefined as any
      };
    }

    // Check for response override
    const responses = AiAgentServiceLocal.responsesByAgentName.get(
      agentConfig.name
    );
    if (responses && responses.length > 0) {
      const response = responses.shift();
      AiAgentServiceLocal.lastResponseByAgentName.set(agentConfig.name, response);
      return {
        success: true,
        output: response,
        workingDir: AiAgentServiceLocal.mockWorkingDir
      };
    }

    // If the queue is exhausted but we have a last response, repeat it.
    // This supports consensus testing where 1 response is set for N runs.
    const lastResponse = AiAgentServiceLocal.lastResponseByAgentName.get(
      agentConfig.name
    );
    if (lastResponse !== undefined) {
      return {
        success: true,
        output: lastResponse,
        workingDir: AiAgentServiceLocal.mockWorkingDir
      };
    }

    // Default mock response
    return {
      success: true,
      output: this.generateDefaultResponse(agentConfig),
      workingDir: AiAgentServiceLocal.mockWorkingDir
    };
  }

  /**
   * Generate a reasonable default response based on the agent's output schema
   */
  private generateDefaultResponse<T>(config: AgentConfig<T>): T {
    // For structured outputs with a schema, return an empty object
    if (config.outputSchema) {
      return {} as T;
    }
    // For string outputs (no schema), return a mock string
    return `Mock response for ${config.name}` as T;
  }
}
