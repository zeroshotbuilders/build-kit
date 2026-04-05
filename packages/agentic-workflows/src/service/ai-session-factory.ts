import { Inject, Injectable } from "@nestjs/common";
import { ConversationSessionModel } from "../repository/session/conversation-session-model";
import {
  CONVERSATION_SESSION_REPOSITORY,
  ConversationSessionRepository
} from "../repository/session/conversation-session-repository";
import { RepositorySession } from "../repository/session/repository-session";

@Injectable()
export class AiSessionFactory {
  constructor(
    @Inject(CONVERSATION_SESSION_REPOSITORY)
    private readonly conversationSessionRepository: ConversationSessionRepository
  ) {}

  public async getOrCreateSession(
    clientId: string,
    sessionId?: string
  ): Promise<RepositorySession> {
    let session: ConversationSessionModel;
    if (sessionId) {
      session = await this.conversationSessionRepository.getSession(sessionId);
    } else {
      session = await this.conversationSessionRepository.createSession(
        clientId
      );
    }
    return new RepositorySession(
      session.sessionId,
      this.conversationSessionRepository
    );
  }
}
