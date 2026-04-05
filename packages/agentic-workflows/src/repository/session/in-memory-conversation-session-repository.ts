import { Injectable } from "@nestjs/common";
import { ServerError, Status } from "nice-grpc";
import { v4 as uuidv4 } from "uuid";
import {
  ConversationItemModel,
  ConversationSessionModel
} from "./conversation-session-model";
import { ConversationSessionRepository } from "./conversation-session-repository";

@Injectable()
export class InMemoryConversationSessionRepository
  implements ConversationSessionRepository
{
  private sessions: Map<string, ConversationSessionModel> = new Map();
  private items: Map<string, ConversationItemModel[]> = new Map();

  async createSession(clientId: string): Promise<ConversationSessionModel> {
    const sessionId = uuidv4();
    const now = Date.now();
    const session: ConversationSessionModel = {
      sessionId,
      clientId,
      createdAt: now,
      updatedAt: now
    };
    this.sessions.set(sessionId, session);
    this.items.set(sessionId, []);
    return session;
  }

  async getSession(sessionId: string): Promise<ConversationSessionModel> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ServerError(
        Status.NOT_FOUND,
        `Session not found: ${sessionId}`
      );
    }
    return session;
  }

  async getConversationItems(
    sessionId: string,
    limit?: number
  ): Promise<ConversationItemModel[]> {
    const sessionItems = this.items.get(sessionId) || [];
    const activeItems = sessionItems.filter((item) => !item.deletedAt);
    if (limit) {
      return activeItems.slice(-limit);
    }
    return activeItems;
  }

  async addConversationItems(
    sessionId: string,
    items: { role: string; content: string; metadata?: Record<string, any> }[]
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    const sessionItems = this.items.get(sessionId) || [];

    const now = Date.now();
    let sequenceNumber =
      sessionItems.length > 0
        ? Math.max(...sessionItems.map((i) => i.sequenceNumber)) + 1
        : 0;

    for (const item of items) {
      const newItem: ConversationItemModel = {
        itemId: uuidv4(),
        sessionId,
        sequenceNumber: sequenceNumber++,
        role: item.role,
        content: item.content,
        metadata: item.metadata ? JSON.stringify(item.metadata) : undefined,
        createdAt: now,
        deletedAt: undefined
      };
      sessionItems.push(newItem);
    }

    this.items.set(sessionId, sessionItems);
    session.updatedAt = now;
  }

  async clearConversation(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    const sessionItems = this.items.get(sessionId) || [];
    const now = Date.now();

    for (const item of sessionItems) {
      if (!item.deletedAt) {
        item.deletedAt = now;
      }
    }

    session.updatedAt = now;
  }

  async popLastItem(
    sessionId: string
  ): Promise<ConversationItemModel | undefined> {
    const session = await this.getSession(sessionId);
    const sessionItems = this.items.get(sessionId) || [];
    const activeItems = sessionItems.filter((item) => !item.deletedAt);

    if (activeItems.length === 0) {
      return undefined;
    }

    const lastItem = activeItems[activeItems.length - 1];
    const now = Date.now();
    lastItem.deletedAt = now;
    session.updatedAt = now;

    return lastItem;
  }
}
