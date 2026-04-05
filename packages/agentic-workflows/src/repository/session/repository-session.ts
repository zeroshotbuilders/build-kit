import type { AgentInputItem, Session } from "@openai/agents";
import { ConversationSessionRepository } from "./conversation-session-repository";

/**
 * Repository-backed session implementation for OpenAI Agents SDK.
 * Stores conversation history in our database instead of in-memory or OpenAI's servers.
 *
 * IMPORTANT: This session only stores plain chat messages, not execution artifacts.
 */
export class RepositorySession implements Session {
  private sessionId: string;
  private repository: ConversationSessionRepository;
  private cachedItems: AgentInputItem[] | undefined = undefined;

  constructor(sessionId: string, repository: ConversationSessionRepository) {
    this.sessionId = sessionId;
    this.repository = repository;
  }

  async getSessionId(): Promise<string> {
    return this.sessionId;
  }

  /**
   * Converts stored string content to the array of content parts expected by the Agents SDK.
   * The SDK requires content to be an array, not a string.
   */
  private toContentParts(
    role: "user" | "assistant" | "system",
    content: string
  ): { type: string; text: string }[] {
    if (role === "user") {
      return [{ type: "input_text", text: content }];
    }

    // assistant + system
    return [{ type: "output_text", text: content }];
  }

  /**
   * Returns conversation items as plain chat messages.
   * Does NOT restore metadata, IDs, or any execution artifacts.
   */
  async getItems(limit?: number): Promise<AgentInputItem[]> {
    if (!limit && this.cachedItems) {
      return this.cachedItems;
    }

    const dbItems = await this.repository.getConversationItems(
      this.sessionId,
      limit
    );

    const items: AgentInputItem[] = dbItems.map((item) => ({
      role: item.role as "user" | "assistant" | "system",
      content: this.toContentParts(
        item.role as "user" | "assistant" | "system",
        item.content
      )
    }));

    if (!limit) {
      this.cachedItems = items;
    }

    return items;
  }

  /**
   * Adds items to the session, down-projecting to plain chat messages.
   * Only persists user, assistant, and system messages.
   * Filters out all execution artifacts (tool_call, tool_result, reasoning, etc.)
   */
  async addItems(items: AgentInputItem[]): Promise<void> {
    // Down-project aggressively: only keep human-visible chat turns
    const messages = items
      .filter(
        (item) =>
          item.role === "user" ||
          item.role === "assistant" ||
          item.role === "system"
      )
      .map((item) => ({
        role: item.role as string,
        content:
          typeof item.content === "string"
            ? item.content
            : JSON.stringify(item.content)
      }));

    if (messages.length > 0) {
      await this.repository.addConversationItems(this.sessionId, messages);
    }

    this.cachedItems = undefined;
  }

  async clearSession(): Promise<void> {
    await this.repository.clearConversation(this.sessionId);
    this.cachedItems = undefined;
  }

  /**
   * Pops the last item from the session.
   * Returns only plain chat message - no metadata.
   */
  async popItem(): Promise<AgentInputItem | undefined> {
    const poppedItem = await this.repository.popLastItem(this.sessionId);
    this.cachedItems = undefined;

    if (!poppedItem) {
      return undefined;
    }

    return {
      role: poppedItem.role as "user" | "assistant" | "system",
      content: this.toContentParts(
        poppedItem.role as "user" | "assistant" | "system",
        poppedItem.content
      )
    };
  }
}
