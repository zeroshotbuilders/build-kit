import "reflect-metadata";
import {
  InMemoryConversationSessionRepository,
  RepositorySession
} from "@zeroshotbuilders/agentic-workflows";
import { Test, TestingModule } from "@nestjs/testing";

describe("InMemoryConversationSessionRepository", () => {
  let repository: InMemoryConversationSessionRepository;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InMemoryConversationSessionRepository]
    }).compile();
    repository = module.get(InMemoryConversationSessionRepository);
  });

  const clientId = "test-client-123";

  it("should create a new session", async () => {
    const session = await repository.createSession(clientId);
    expect(session.sessionId).toBeDefined();
    const retrievedSession = await repository.getSession(session.sessionId);
    expect(retrievedSession.clientId).toEqual(clientId);
  });

  it("should store and retrieve conversation items", async () => {
    const session = await repository.createSession(clientId);
    const sessionId = session.sessionId;
    const items = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!", metadata: { model: "gpt-4" } }
    ];
    await repository.addConversationItems(sessionId, items);
    const retrievedItems = await repository.getConversationItems(sessionId);
    expect(retrievedItems).toHaveLength(2);
    expect(retrievedItems[0].role).toEqual("user");
    expect(retrievedItems[0].content).toEqual("Hello");
    expect(retrievedItems[0].sequenceNumber).toEqual(0);
    expect(retrievedItems[1].role).toEqual("assistant");
    expect(retrievedItems[1].content).toEqual("Hi there!");
    expect(retrievedItems[1].sequenceNumber).toEqual(1);
    expect(JSON.parse(retrievedItems[1].metadata)).toEqual({ model: "gpt-4" });
  });

  it("should update session timestamp on each interaction", async () => {
    const session = await repository.createSession(clientId);
    const sessionId = session.sessionId;
    const initialSession = await repository.getSession(sessionId);
    const initialTimestamp = initialSession.updatedAt;
    await new Promise((resolve) => setTimeout(resolve, 10));
    await repository.addConversationItems(sessionId, [{ role: "user", content: "Wait a bit" }]);
    const updatedSession = await repository.getSession(sessionId);
    expect(updatedSession.updatedAt).toBeGreaterThan(initialTimestamp);
  });

  it("should delete conversation items when clearing conversation", async () => {
    const session = await repository.createSession(clientId);
    const sessionId = session.sessionId;
    await repository.addConversationItems(sessionId, [{ role: "user", content: "Clear me" }]);
    let items = await repository.getConversationItems(sessionId);
    expect(items.length).toBeGreaterThan(0);
    await repository.clearConversation(sessionId);
    items = await repository.getConversationItems(sessionId);
    expect(items).toHaveLength(0);
  });

  it("should delete last item when popping", async () => {
    const session = await repository.createSession(clientId);
    const sessionId = session.sessionId;
    await repository.addConversationItems(sessionId, [
      { role: "user", content: "Item 1" },
      { role: "assistant", content: "Item 2" }
    ]);
    const itemsBefore = await repository.getConversationItems(sessionId);
    const lastItemBefore = itemsBefore[itemsBefore.length - 1];
    const popped = await repository.popLastItem(sessionId);
    expect(popped?.itemId).toEqual(lastItemBefore.itemId);
    const itemsAfter = await repository.getConversationItems(sessionId);
    expect(itemsAfter).toHaveLength(itemsBefore.length - 1);
  });

  describe("RepositorySession with InMemory", () => {
    it("should work as an OpenAI Agents SDK Session", async () => {
      const sessionModel = await repository.createSession(clientId);
      const session: any = new RepositorySession(sessionModel.sessionId, repository);
      await session.addItems([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi!" }
      ]);
      const items = await session.getItems();
      expect(items).toHaveLength(2);
      expect(items[0].role).toEqual("user");
      expect(items[0].content).toEqual([{ type: "input_text", text: "Hello" }]);
      const popped = await session.popItem();
      expect(popped?.content).toEqual([{ type: "output_text", text: "Hi!" }]);
      const itemsAfterPop = await session.getItems();
      expect(itemsAfterPop).toHaveLength(1);
      await session.clearSession();
      const itemsAfterClear = await session.getItems();
      expect(itemsAfterClear).toHaveLength(0);
    });

    describe("chat message filtering (execution artifact removal)", () => {
      it("should only persist user, assistant, and system messages", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await session.addItems([
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
          { role: "system", content: "You are a helpful assistant." }
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(3);
        expect(items[0].role).toEqual("user");
        expect(items[1].role).toEqual("assistant");
        expect(items[2].role).toEqual("system");
      });

      it("should filter out reasoning items when adding", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await session.addItems([
          { role: "user", content: "Hello" },
          { role: "reasoning", content: "Internal reasoning..." } as any,
          { role: "assistant", content: "Hi there!" }
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(2);
        expect(items[0].role).toEqual("user");
        expect(items[1].role).toEqual("assistant");
      });

      it("should filter out tool_call items when adding", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await session.addItems([
          { role: "user", content: "Search for something" },
          { role: "tool_call", content: "search query", id: "call_123" } as any,
          { role: "assistant", content: "Here are the results" }
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(2);
        expect(items[0].role).toEqual("user");
        expect(items[1].role).toEqual("assistant");
      });

      it("should filter out tool_result items when adding", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await session.addItems([
          { role: "user", content: "Search for something" },
          { role: "tool_result", content: "search results", callId: "call_123" } as any,
          { role: "assistant", content: "Here are the results" }
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(2);
        expect(items[0].role).toEqual("user");
        expect(items[1].role).toEqual("assistant");
      });

      it("should filter out items with type instead of role", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await session.addItems([
          { role: "user", content: "Hello" },
          { type: "reasoning", content: "Internal reasoning..." } as any,
          { type: "message", id: "msg_123", content: "Some message" } as any,
          { role: "assistant", content: "Hi there!" }
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(2);
        expect(items[0].role).toEqual("user");
        expect(items[1].role).toEqual("assistant");
      });

      it("should handle empty items array when all items are execution artifacts", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await session.addItems([
          { role: "reasoning", content: "Reasoning 1" } as any,
          { role: "tool_call", content: "Tool call" } as any,
          { role: "tool_result", content: "Tool result" } as any
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(0);
      });

      it("should NOT preserve metadata like tool_calls on assistant messages", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await session.addItems([
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Let me search for that", tool_calls: [{ id: "call_123", name: "search" }] } as any
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(2);
        expect(items[1].role).toEqual("assistant");
        expect(items[1].content).toEqual([{ type: "output_text", text: "Let me search for that" }]);
        expect((items[1] as any).tool_calls).toBeUndefined();
      });

      it("should return plain chat messages without any metadata", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await session.addItems([
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi!" }
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(2);
        for (const item of items) {
          const keys = Object.keys(item);
          expect(keys).toEqual(["role", "content"]);
        }
      });

      it("should handle non-string content by JSON stringifying and converting to content parts", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        const arrayContent = [{ type: "text", text: "Hello" }];
        await session.addItems([{ role: "user", content: arrayContent } as any]);
        const items = await session.getItems();
        expect(items).toHaveLength(1);
        expect(Array.isArray(items[0].content)).toBe(true);
        expect(items[0].content).toEqual([{ type: "input_text", text: JSON.stringify(arrayContent) }]);
      });

      it("should handle array content (like assistant content parts) correctly", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        const arrayContent = [{ type: "output_text", text: "Hello, how can I help you?", annotations: [] as any[], logprobs: [] as any[] }];
        await session.addItems([{ role: "assistant", content: arrayContent } as any]);
        const items = await session.getItems();
        expect(items).toHaveLength(1);
        expect(Array.isArray(items[0].content)).toBe(true);
        expect(items[0].content).toEqual([{ type: "output_text", text: JSON.stringify(arrayContent) }]);
      });

      it("should convert plain string content to content parts array", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await session.addItems([
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" }
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(2);
        expect(Array.isArray(items[0].content)).toBe(true);
        expect(items[0].content).toEqual([{ type: "input_text", text: "Hello" }]);
        expect(Array.isArray(items[1].content)).toBe(true);
        expect(items[1].content).toEqual([{ type: "output_text", text: "Hi there!" }]);
      });

      it("should return plain chat message from popItem without metadata", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await repository.addConversationItems(sessionModel.sessionId, [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi!", metadata: { id: "msg_123", type: "message" } }
        ]);
        const popped = await session.popItem();
        expect(popped).toBeDefined();
        expect(popped?.role).toEqual("assistant");
        expect(popped?.content).toEqual([{ type: "output_text", text: "Hi!" }]);
        expect((popped as any).id).toBeUndefined();
        expect((popped as any).type).toBeUndefined();
      });

      it("should handle legacy data with reasoning role by returning all stored items", async () => {
        const sessionModel = await repository.createSession(clientId);
        const session: any = new RepositorySession(sessionModel.sessionId, repository);
        await repository.addConversationItems(sessionModel.sessionId, [
          { role: "user", content: "Hello" },
          { role: "reasoning", content: "Internal reasoning..." },
          { role: "assistant", content: "Hi there!" }
        ]);
        const items = await session.getItems();
        expect(items).toHaveLength(3);
        expect(items[0].role).toEqual("user");
        expect(items[1].role).toEqual("reasoning");
        expect(items[2].role).toEqual("assistant");
      });
    });
  });
});
