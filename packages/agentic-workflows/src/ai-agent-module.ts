import {
  ApplicationConfig,
  ConfigModule
} from "@zeroshotbuilders/commons";
import { DynamicModule, Module } from "@nestjs/common";
import { AiAgentFactory } from "./ai-agent-factory";
import { AiAgentConfig } from "./config/ai-agent-config";
import { CONVERSATION_SESSION_REPOSITORY } from "./repository/session/conversation-session-repository";
import { InMemoryConversationSessionRepository } from "./repository/session/in-memory-conversation-session-repository";
import { AiSessionFactory } from "./service/ai-session-factory";

export const AI_AGENT_APPLICATION_ROOT = "AiAgentApplicationRoot";
export const AI_AGENT_SERVICE = "AI_AGENT_SERVICE";

@Module({})
export class AiAgentModule {
  /**
   * Creates a module configured for the given application root.
   * Uses the configuration from the application's config.yaml to determine
   * which provider (OpenAI or Ollama) to use.
   *
   * @param applicationRoot - The root directory of the application
   * @returns A configured DynamicModule
   */
  public static forApplicationRoot(applicationRoot: string): DynamicModule {
    return {
      module: AiAgentModule,
      imports: [
        ConfigModule.forApplicationRoot(applicationRoot)
      ],
      providers: [
        {
          provide: AI_AGENT_APPLICATION_ROOT,
          useValue: applicationRoot
        },
        {
          provide: AiAgentConfig,
          useFactory: (applicationConfig: ApplicationConfig) => {
            return AiAgentConfig.create(applicationConfig);
          },
          inject: [ApplicationConfig]
        },
        AiAgentFactory,
        {
          provide: AI_AGENT_SERVICE,
          useFactory: (aiAgentFactory: AiAgentFactory) =>
            aiAgentFactory.makeAiAgentService(),
          inject: [AiAgentFactory]
        },
        InMemoryConversationSessionRepository,
        {
          provide: CONVERSATION_SESSION_REPOSITORY,
          useExisting: InMemoryConversationSessionRepository
        },
        AiSessionFactory
      ],
      exports: [
        AI_AGENT_SERVICE,
        AiAgentFactory,
        AiAgentConfig,
        CONVERSATION_SESSION_REPOSITORY,
        AiSessionFactory
      ]
    };
  }
}
