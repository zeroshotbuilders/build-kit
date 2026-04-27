import { Agent, OpenAIProvider, Runner } from "@openai/agents";
import { createLogger, transports } from "winston";
import {
  AgentConfig,
  AgentRunConfig,
  AgentRunResult,
  AgentType,
  AiAgentService
} from "./ai-agent-service";

/**
 * Ollama-based implementation of the AI agent service.
 * Uses Ollama's OpenAI-compatible API endpoint via the @openai/agents SDK.
 *
 * Ollama provides an OpenAI-compatible API at /v1, which allows us to use
 * the same OpenAI SDK with a different base URL pointing to the local
 * Ollama instance.
 */
export class AiAgentServiceOllama implements AiAgentService {
  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });

  private readonly defaultModel: string;
  private readonly runner: Runner;

  /**
   * Creates an Ollama-based AI agent service.
   *
   * @param baseUrl - The base URL of the Ollama instance (e.g., "http://localhost:11434")
   * @param defaultModel - The default model to use (e.g., "llama2", "mistral", "codellama")
   */
  constructor(baseUrl: string, defaultModel = "qwen2.5:14b") {
    this.defaultModel = defaultModel;
    // Ollama exposes an OpenAI-compatible API at /v1
    const provider = new OpenAIProvider({
      baseURL: `${baseUrl}/v1`,
      apiKey: "ollama", // Ollama doesn't require an API key, but the SDK requires a non-empty value
      useResponses: false // Use chat completions API for Ollama compatibility
    });
    this.runner = new Runner({
      modelProvider: provider
    });
  }

  public createAgent<T>(config: AgentConfig<T>): AgentType<T> {
    return new Agent({
      name: config.name,
      instructions: config.instructions,
      model: config.model ?? this.defaultModel,
      tools: config.tools ?? [],
      outputType: config.outputSchema as any,
      modelSettings: config.modelSettings,
      inputGuardrails: config.inputGuardrails ?? undefined
    }) as unknown as AgentType<T>;
  }

  public async runAgent<T>(
    agent: AgentType<T>,
    config: AgentRunConfig
  ): Promise<AgentRunResult<T>> {
    try {
      const runOptions: Record<string, unknown> = {};
      if (config.session) {
        runOptions["session"] = config.session;
      }
      if (config.maxTurns !== undefined) {
        runOptions["maxTurns"] = config.maxTurns;
      }
      const result =
        Object.keys(runOptions).length > 0
          ? await this.runner.run(agent, config.input, runOptions)
          : await this.runner.run(agent, config.input);
      return {
        output: result.finalOutput as T,
        success: true,
        rawResult: result
      };
    } catch (error) {
      this.logger.error(
        `Error running Ollama agent ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {
        output: "" as unknown as T,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async createAndRun<T>(
    agentConfig: AgentConfig<T>,
    runConfig: AgentRunConfig
  ): Promise<AgentRunResult<T>> {
    const agent = this.createAgent(agentConfig);
    return this.runAgent(agent, runConfig);
  }
}
