import { Agent, run, setDefaultOpenAIKey } from "@openai/agents";
import { createLogger, transports } from "winston";
import {
  AgentConfig,
  AgentRunConfig,
  AgentRunResult,
  AgentType,
  AiAgentService
} from "./ai-agent-service";

/**
 * OpenAI-based implementation of the AI agent service.
 * Uses the OpenAI API directly via the @openai/agents SDK.
 */
export class AiAgentServiceOpenai implements AiAgentService {
  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });

  private readonly defaultModel: string;

  constructor(apiKey: string, defaultModel = "gpt-4o") {
    this.defaultModel = defaultModel;
    setDefaultOpenAIKey(apiKey);
  }

  public createAgent<T>(config: AgentConfig<T>): AgentType<T> {
    return new Agent({
      name: config.name,
      instructions: config.instructions,
      model: config.model ?? this.defaultModel,
      tools: config.tools ?? [],
      outputType: config.outputSchema,
      modelSettings: config.modelSettings,
      inputGuardrails: config.inputGuardrails ?? []
    }) as AgentType<T>;
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
          ? await run(agent, config.input, runOptions)
          : await run(agent, config.input);

      return {
        output: result.finalOutput as T,
        success: true,
        rawResult: result
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const logMessage = `Error running OpenAI agent ${errorMessage}`;
      if (this.isMaxTurnsExceededError(errorMessage)) {
        this.logger.warn(logMessage);
      } else {
        this.logger.error(logMessage);
      }
      return {
        output: "" as unknown as T,
        success: false,
        error: errorMessage
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

  private isMaxTurnsExceededError(errorMessage: string): boolean {
    return /max turns \(\d+\) exceeded/i.test(errorMessage);
  }
}
