import { Injectable } from "@nestjs/common";
import { AiAgentConfig, AiAgentProvider } from "./config/ai-agent-config";
import { AiAgentService } from "./service/ai-agent-service";
import { AiAgentServiceLocal } from "./service/ai-agent-service-local";
import { AiAgentServiceOllama } from "./service/ai-agent-service-ollama";
import { AiAgentServiceOpenai } from "./service/ai-agent-service-openai";

/**
 * Factory for creating AI agent service instances.
 * Automatically selects the appropriate implementation based on configuration.
 */
@Injectable()
export class AiAgentFactory {
  constructor(private readonly config: AiAgentConfig) {}

  /**
   * Creates an AI agent service based on the configured provider.
   * In local/test mode, returns the local mock implementation.
   *
   * @returns An AiAgentService implementation (Local, OpenAI, or Ollama)
   * @throws Error if the provider is not supported or required configuration is missing
   */
  public makeAiAgentService(): AiAgentService {
    // Use local mock implementation in test mode
    if (this.config.local) {
      return AiAgentServiceLocal.getInstance();
    }

    switch (this.config.provider) {
      case AiAgentProvider.OPENAI:
        return this.makeOpenaiService();
      case AiAgentProvider.OLLAMA:
        return this.makeOllamaService();
      default:
        throw new Error(
          `Unsupported AI agent provider: ${this.config.provider}`
        );
    }
  }

  /**
   * Creates an OpenAI-based AI agent service.
   *
   * @returns An AiAgentServiceOpenai instance
   * @throws Error if the OpenAI API token is not configured
   */
  public makeOpenaiService(): AiAgentServiceOpenai {
    if (!this.config.openaiApiToken) {
      throw new Error("OpenAI API token is required for OpenAI provider");
    }
    return new AiAgentServiceOpenai(
      this.config.openaiApiToken,
      this.config.defaultModel
    );
  }

  /**
   * Creates an Ollama-based AI agent service.
   *
   * @returns An AiAgentServiceOllama instance
   */
  public makeOllamaService(): AiAgentServiceOllama {
    return new AiAgentServiceOllama(
      this.config.ollamaBaseUrl ?? "http://localhost:11434",
      this.config.defaultModel
    );
  }

  /**
   * Creates an Ollama-based AI agent service with a custom base URL.
   * Useful for testing with OllamaFixture.
   *
   * @param baseUrl - The base URL of the Ollama instance
   * @param defaultModel - Optional default model to use
   * @returns An AiAgentServiceOllama instance
   */
  public static makeOllamaServiceForUrl(
    baseUrl: string,
    defaultModel?: string
  ): AiAgentServiceOllama {
    return new AiAgentServiceOllama(baseUrl, defaultModel);
  }

  /**
   * Creates an OpenAI-based AI agent service with explicit credentials.
   * Useful for testing or when not using dependency injection.
   *
   * @param apiKey - The OpenAI API key
   * @param defaultModel - Optional default model to use
   * @returns An AiAgentServiceOpenai instance
   */
  public static makeOpenaiServiceForKey(
    apiKey: string,
    defaultModel?: string
  ): AiAgentServiceOpenai {
    return new AiAgentServiceOpenai(apiKey, defaultModel);
  }
}
