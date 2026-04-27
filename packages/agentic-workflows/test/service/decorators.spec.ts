import * as fs from "fs";
import * as path from "path";
import {
  Agent,
  AgenticWorkflow,
  AgentRunConfig,
  AgentRunResult,
  AiAgentService,
  ConsensusAgent,
  ConsensusRunResult,
  ConsensusStrategy,
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

  @ConsensusAgent({
    tools: [],
    runs: 3,
    consensusStrategy: ConsensusStrategy.MAJORITY
  })
  async majorityMethod(input: string): Promise<ConsensusRunResult<any>> {
    return null;
  }

  @ConsensusAgent({
    tools: [],
    runs: 3,
    consensusStrategy: ConsensusStrategy.UNANIMOUS
  })
  async unanimousMethod(input: string): Promise<ConsensusRunResult<any>> {
    return null;
  }

  @ConsensusAgent({
    tools: [],
    runs: 3,
    consensusStrategy: ConsensusStrategy.JUDGE,
    judge: async (_instance, results) => results[0]
  })
  async judgeMethod(input: string): Promise<ConsensusRunResult<any>> {
    return null;
  }

  @ConsensusAgent({
    tools: [],
    runs: 3,
    consensusStrategy: ConsensusStrategy.MAJORITY,
    temperatureSpread: [0.2, 1.0]
  })
  async tempSpreadMethod(input: string): Promise<ConsensusRunResult<any>> {
    return null;
  }
}

const promptsDir = path.join(__dirname, "prompts");
const promptContent = "---\ntools: []\n---\nTest instructions";

beforeAll(() => {
  if (!fs.existsSync(promptsDir)) {
    fs.mkdirSync(promptsDir, { recursive: true });
  }
  for (const name of [
    "testMethod", "testModelOverrideMethod",
    "majorityMethod", "unanimousMethod", "judgeMethod", "tempSpreadMethod"
  ]) {
    fs.writeFileSync(path.join(promptsDir, `${name}.md`), promptContent);
  }
});

afterAll(() => {
  if (fs.existsSync(promptsDir)) {
    fs.rmSync(promptsDir, { recursive: true });
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("@Agent decorator", () => {

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

describe("@ConsensusAgent decorator", () => {
  const promptsDir = path.join(__dirname, "prompts");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw when runs is even", () => {
    expect(() => {
      ConsensusAgent({
        tools: [],
        runs: 4,
        consensusStrategy: ConsensusStrategy.MAJORITY
      });
    }).toThrow("ConsensusAgent requires an odd number of runs, got 4");
  });

  it("should throw when JUDGE strategy has no judge function", () => {
    expect(() => {
      ConsensusAgent({
        tools: [],
        runs: 3,
        consensusStrategy: ConsensusStrategy.JUDGE
      });
    }).toThrow("ConsensusAgent with JUDGE strategy requires a judge function");
  });

  describe("MAJORITY strategy", () => {
    it("should return the majority output when all agree", async () => {
      const workflow = new TestWorkflow(mockAiAgentService);
      (mockAiAgentService.createAndRun as jest.Mock).mockResolvedValue({
        success: true,
        output: { answer: true }
      });

      const result = await workflow.majorityMethod("test");

      expect(mockAiAgentService.createAndRun).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ answer: true });
      expect(result.agreement).toBe(1);
      expect(result.totalRuns).toBe(3);
      expect(result.successfulRuns).toBe(3);
      expect(result.runs).toHaveLength(3);
    });

    it("should return the majority output when 2/3 agree", async () => {
      const workflow = new TestWorkflow(mockAiAgentService);
      (mockAiAgentService.createAndRun as jest.Mock)
        .mockResolvedValueOnce({ success: true, output: { answer: true } })
        .mockResolvedValueOnce({ success: true, output: { answer: true } })
        .mockResolvedValueOnce({ success: true, output: { answer: false } });

      const result = await workflow.majorityMethod("test");

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ answer: true });
      expect(result.agreement).toBeCloseTo(2 / 3);
      expect(result.successfulRuns).toBe(3);
    });

    it("should handle failed runs and reflect reduced successful count", async () => {
      const workflow = new TestWorkflow(mockAiAgentService);
      (mockAiAgentService.createAndRun as jest.Mock)
        .mockResolvedValueOnce({ success: true, output: "yes" })
        .mockResolvedValueOnce({ success: false, error: "timeout" })
        .mockResolvedValueOnce({ success: true, output: "yes" });

      const result = await workflow.majorityMethod("test");

      expect(result.success).toBe(true);
      expect(result.output).toBe("yes");
      expect(result.totalRuns).toBe(3);
      expect(result.successfulRuns).toBe(2);
      expect(result.agreement).toBe(1); // 2/2 successful runs agreed
    });

    it("should fail when all runs fail", async () => {
      const workflow = new TestWorkflow(mockAiAgentService);
      (mockAiAgentService.createAndRun as jest.Mock).mockResolvedValue({
        success: false,
        error: "fail"
      });

      const result = await workflow.majorityMethod("test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("All runs failed");
      expect(result.successfulRuns).toBe(0);
    });
  });

  describe("UNANIMOUS strategy", () => {
    it("should succeed when all runs agree", async () => {
      const workflow = new TestWorkflow(mockAiAgentService);
      (mockAiAgentService.createAndRun as jest.Mock).mockResolvedValue({
        success: true,
        output: "same"
      });

      const result = await workflow.unanimousMethod("test");

      expect(result.success).toBe(true);
      expect(result.output).toBe("same");
      expect(result.agreement).toBe(1);
    });

    it("should fail when any run disagrees", async () => {
      const workflow = new TestWorkflow(mockAiAgentService);
      (mockAiAgentService.createAndRun as jest.Mock)
        .mockResolvedValueOnce({ success: true, output: "a" })
        .mockResolvedValueOnce({ success: true, output: "a" })
        .mockResolvedValueOnce({ success: true, output: "b" });

      const result = await workflow.unanimousMethod("test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unanimous consensus not reached");
    });
  });

  describe("JUDGE strategy", () => {
    it("should delegate to the judge function", async () => {
      const workflow = new TestWorkflow(mockAiAgentService);
      (mockAiAgentService.createAndRun as jest.Mock)
        .mockResolvedValueOnce({ success: true, output: "a" })
        .mockResolvedValueOnce({ success: true, output: "b" })
        .mockResolvedValueOnce({ success: true, output: "c" });

      const result = await workflow.judgeMethod("test");

      // Judge picks first result
      expect(result.success).toBe(true);
      expect(result.output).toBe("a");
      expect(result.totalRuns).toBe(3);
      expect(result.successfulRuns).toBe(3);
      expect(result.runs).toHaveLength(3);
    });

    it("should fail when all runs fail before judge", async () => {
      const workflow = new TestWorkflow(mockAiAgentService);
      (mockAiAgentService.createAndRun as jest.Mock).mockResolvedValue({
        success: false,
        error: "fail"
      });

      const result = await workflow.judgeMethod("test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("All runs failed");
    });
  });

  describe("temperatureSpread", () => {
    it("should vary temperature across runs", async () => {
      const workflow = new TestWorkflow(mockAiAgentService);
      (mockAiAgentService.createAndRun as jest.Mock).mockResolvedValue({
        success: true,
        output: "ok"
      });

      await workflow.tempSpreadMethod("test");

      expect(mockAiAgentService.createAndRun).toHaveBeenCalledTimes(3);

      const calls = (mockAiAgentService.createAndRun as jest.Mock).mock.calls;
      const temps = calls.map(
        ([agentConfig]: [any]) => agentConfig.modelSettings.temperature
      );

      expect(temps[0]).toBeCloseTo(0.2);
      expect(temps[1]).toBeCloseTo(0.6);
      expect(temps[2]).toBeCloseTo(1.0);
    });
  });
});
