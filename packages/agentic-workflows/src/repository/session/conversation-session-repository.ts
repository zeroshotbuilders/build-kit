import {
  ConversationItemModel,
  ConversationSessionModel
} from "./conversation-session-model";

export const CONVERSATION_SESSION_REPOSITORY =
  "CONVERSATION_SESSION_REPOSITORY";

export interface ConversationSessionRepository {
  createSession(clientId: string): Promise<ConversationSessionModel>;

  getSession(sessionId: string): Promise<ConversationSessionModel>;

  getConversationItems(
    sessionId: string,
    limit?: number
  ): Promise<ConversationItemModel[]>;

  addConversationItems(
    sessionId: string,
    items: { role: string; content: string; metadata?: Record<string, any> }[]
  ): Promise<void>;

  clearConversation(sessionId: string): Promise<void>;

  popLastItem(sessionId: string): Promise<ConversationItemModel | undefined>;
}
