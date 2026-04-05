import { ApplicationConfig, loadConfig } from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";

/**
 * Provider type for the AI agent service
 */
export enum AiAgentProvider {
  OPENAI = "openai",
  OLLAMA = "ollama"
}

/**
 * Configuration for the AI agent service.
 * Supports both OpenAI and Ollama providers.
 */
@Injectable()
export class AiAgentConfig {
  private static readonly CONFIG_KEY = "aiAgent";

  /** Whether running in local/test mode */
  readonly local: boolean;

  /** The provider to use (openai or ollama) */
  readonly provider: AiAgentProvider;

  /** OpenAI API token (required for OpenAI provider) */
  readonly openaiApiToken?: string;

  /** Ollama base URL (required for Ollama provider, defaults to localhost:11434) */
  readonly ollamaBaseUrl?: string;

  /** Default model to use */
  readonly defaultModel?: string;

  static create(
    applicationConfig: ApplicationConfig
  ): AiAgentConfig {
    const config = loadConfig<AiAgentConfig>(
      applicationConfig.applicationRoot,
      AiAgentConfig.CONFIG_KEY
    );
    return {
      local: applicationConfig.local,
      provider: config.provider ?? AiAgentProvider.OPENAI,
      openaiApiToken:
        config.openaiApiToken ?? process.env.OPENAI_API_KEY,
      ollamaBaseUrl: config.ollamaBaseUrl ?? "http://localhost:11434",
      defaultModel: config.defaultModel
    };
  }
}
