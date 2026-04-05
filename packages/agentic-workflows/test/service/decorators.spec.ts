import * as fs from "fs";
import * as path from "path";
import {
  Agent,
  AgenticWorkflow,
  AgentRunConfig,
  AgentRunResult,
  AiAgentService,
  RepositorySession
} from "../../index";

const mockAiAgentService: AiAgentService = {
  createAndRun: jest.fn(),
  createAgent: jest.fn(),
  runAgent: jest.fn()
};

@AgenticWorkflow({
  promptsDirectory: path.join(__dirname, "prompts")
})
class TestWorkflow {
  constructor(public readonly aiAgentService: AiAgentService) {}

  @Agent({ tools: [] })
  async testMethod(input: string, session?: RepositorySession): Promise<AgentRunResult<any>> {
    return null;
  }

  @Agent({ model: "test-model-override", tools: [] })
  async testModelOverrideMethod(input: string): Promise<AgentRunResult<any>> {
    return null;
  }
}

describe("@Agent decorator", () => {
  const promptsDir = path.join(__dirname, "prompts");

  beforeAll(() => {
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(promptsDir, "testMethod.md"), "---\ntools: []\n---\nTest instructions");
    fs.writeFileSync(path.join(promptsDir, "testModelOverrideMethod.md"), "---\ntools: []\n---\nTest instructions");
  });

  afterAll(() => {
    if (fs.existsSync(promptsDir)) {
      fs.rmSync(promptsDir, { recursive: true });
    }
  });

  it("should pick up session from arguments", async () => {
    const workflow = new TestWorkflow(mockAiAgentService);
    const mockSession = Object.create(RepositorySession.prototype);
    mockSession.sessionId = "test-session";
    (mockAiAgentService.createAndRun as jest.Mock).mockResolvedValue({ success: true });
    await workflow.testMethod("hello", mockSession);
    expect(mockAiAgentService.createAndRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: mockSession })
    );
  });

  it("should not include session in the input JSON", async () => {
    const workflow = new TestWorkflow(mockAiAgentService);
    const mockSession = Object.create(RepositorySession.prototype);
    mockSession.sessionId = "test-session";
    (mockAiAgentService.createAndRun as jest.Mock).mockResolvedValue({ success: true });
    await workflow.testMethod("hello", mockSession);
    const callArgs = (mockAiAgentService.createAndRun as jest.Mock).mock.calls[0];
    const runConfig: AgentRunConfig = callArgs[1];
    const input = JSON.parse(runConfig.input);
    expect(input).toHaveProperty("input", "hello");
    expect(input).not.toHaveProperty("session");
  });

  it("should pass the model override to createAndRun", async () => {
    const workflow = new TestWorkflow(mockAiAgentService);
    (mockAiAgentService.createAndRun as jest.Mock).mockResolvedValue({ success: true });
    await workflow.testModelOverrideMethod("hello");
    expect(mockAiAgentService.createAndRun).toHaveBeenCalledWith(
      expect.objectContaining({ model: "test-model-override" }),
      expect.anything()
    );
  });
});
