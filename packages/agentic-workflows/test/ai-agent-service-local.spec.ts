import { z } from "zod";
import { AgentConfig } from "@zeroshotbuilders/agentic-workflows";
import { AiAgentServiceLocal } from "@zeroshotbuilders/agentic-workflows";

describe("AiAgentServiceLocal", () => {
  let service: AiAgentServiceLocal;

  beforeEach(() => {
    service = AiAgentServiceLocal.getInstance();
    AiAgentServiceLocal.clearAllOverrides();
  });

  afterEach(() => {
    AiAgentServiceLocal.clearAllOverrides();
  });

  describe("Single Agent Execution", () => {
    it("should return a mocked response for a string output agent", async () => {
      const agentConfig: AgentConfig<string> = {
        name: "TestStringAgent",
        instructions: "You are a test agent that returns strings",
        tools: []
      };
      const mockResponse = "This is a test response";
      AiAgentServiceLocal.setResponse("TestStringAgent", mockResponse);
      const result = await service.createAndRun(agentConfig, { input: "Test input" });
      expect(result.success).toBe(true);
      expect(result.output).toBe(mockResponse);
      expect(result.error).toBeUndefined();
    });

    it("should return a mocked response for a structured output agent", async () => {
      const outputSchema = z.object({ links: z.array(z.string()) });
      type LinksOutput = z.infer<typeof outputSchema>;
      const agentConfig: AgentConfig<LinksOutput> = {
        name: "TestAgent:extractLinks",
        instructions: "You extract links from web pages",
        outputSchema,
        tools: []
      };
      const mockResponse: LinksOutput = {
        links: ["https://example.com/page1", "https://example.com/page2"]
      };
      AiAgentServiceLocal.setResponse("TestAgent:extractLinks", mockResponse);
      const result = await service.createAndRun(agentConfig, { input: "Extract links from this page" });
      expect(result.success).toBe(true);
      expect(result.output).toEqual(mockResponse);
      expect(result.output.links).toHaveLength(2);
    });
  });

  describe("Multiple Responses for Same Agent (Loop Scenario)", () => {
    it("should return responses in order when agent is called multiple times", async () => {
      const agentConfig: AgentConfig<string> = {
        name: "TestAgent:summarizeLink",
        instructions: "You summarize web page content",
        tools: []
      };
      const mockResponses = ["Summary for first link", "Summary for second link", "Summary for third link"];
      AiAgentServiceLocal.setResponses("TestAgent:summarizeLink", mockResponses);
      const result1 = await service.createAndRun(agentConfig, { input: "Summarize link 1" });
      const result2 = await service.createAndRun(agentConfig, { input: "Summarize link 2" });
      const result3 = await service.createAndRun(agentConfig, { input: "Summarize link 3" });
      expect(result1.success).toBe(true);
      expect(result1.output).toBe(mockResponses[0]);
      expect(result2.success).toBe(true);
      expect(result2.output).toBe(mockResponses[1]);
      expect(result3.success).toBe(true);
      expect(result3.output).toBe(mockResponses[2]);
    });

    it("should support adding responses incrementally with setResponse", async () => {
      const agentConfig: AgentConfig<string> = { name: "IncrementalAgent", instructions: "Test agent", tools: [] };
      AiAgentServiceLocal.setResponse("IncrementalAgent", "Response 1");
      AiAgentServiceLocal.setResponse("IncrementalAgent", "Response 2");
      const result1 = await service.createAndRun(agentConfig, { input: "Test 1" });
      const result2 = await service.createAndRun(agentConfig, { input: "Test 2" });
      expect(result1.output).toBe("Response 1");
      expect(result2.output).toBe("Response 2");
    });

    it("should mix setResponse and setResponses calls", async () => {
      const agentConfig: AgentConfig<string> = { name: "MixedAgent", instructions: "Test agent", tools: [] };
      AiAgentServiceLocal.setResponse("MixedAgent", "First");
      AiAgentServiceLocal.setResponses("MixedAgent", ["Second", "Third"]);
      AiAgentServiceLocal.setResponse("MixedAgent", "Fourth");
      const results = await Promise.all([
        service.createAndRun(agentConfig, { input: "1" }),
        service.createAndRun(agentConfig, { input: "2" }),
        service.createAndRun(agentConfig, { input: "3" }),
        service.createAndRun(agentConfig, { input: "4" })
      ]);
      expect(results[0].output).toBe("First");
      expect(results[1].output).toBe("Second");
      expect(results[2].output).toBe("Third");
      expect(results[3].output).toBe("Fourth");
    });
  });

  describe("Error Handling", () => {
    it("should return a failed result when an error is set", async () => {
      const agentConfig: AgentConfig<string> = { name: "FailingAgent", instructions: "This agent will fail", tools: [] };
      const errorMessage = "Failed to fetch page content";
      AiAgentServiceLocal.setError("FailingAgent", errorMessage);
      const result = await service.createAndRun(agentConfig, { input: "This should fail" });
      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.output).toBeUndefined();
    });

    it("should prioritize errors over responses", async () => {
      const agentConfig: AgentConfig<string> = { name: "ErrorPriorityAgent", instructions: "Test agent", tools: [] };
      AiAgentServiceLocal.setResponse("ErrorPriorityAgent", "This should not be returned");
      AiAgentServiceLocal.setError("ErrorPriorityAgent", "Error takes priority");
      const result = await service.createAndRun(agentConfig, { input: "Test" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error takes priority");
    });
  });

  describe("Default Responses", () => {
    it("should return a default string response when no mock is configured", async () => {
      const agentConfig: AgentConfig<string> = { name: "UnmockedStringAgent", instructions: "No mock configured", tools: [] };
      const result = await service.createAndRun(agentConfig, { input: "Test" });
      expect(result.success).toBe(true);
      expect(result.output).toBe("Mock response for UnmockedStringAgent");
    });

    it("should return an empty object for structured output when no mock is configured", async () => {
      const outputSchema = z.object({ steps: z.array(z.string()) });
      const agentConfig: AgentConfig<z.infer<typeof outputSchema>> = {
        name: "UnmockedStructuredAgent",
        instructions: "No mock configured",
        outputSchema,
        tools: []
      };
      const result = await service.createAndRun(agentConfig, { input: "Test" });
      expect(result.success).toBe(true);
      expect(result.output).toEqual({});
    });

    it("should repeat last response after all mocked responses are consumed", async () => {
      const agentConfig: AgentConfig<string> = { name: "ExhaustedAgent", instructions: "Test agent", tools: [] };
      AiAgentServiceLocal.setResponses("ExhaustedAgent", ["Response 1", "Response 2"]);
      await service.createAndRun(agentConfig, { input: "1" });
      await service.createAndRun(agentConfig, { input: "2" });
      const result = await service.createAndRun(agentConfig, { input: "3" });
      expect(result.success).toBe(true);
      expect(result.output).toBe("Response 2");
    });
  });

  describe("Cleanup Methods", () => {
    it("should clear all responses", async () => {
      AiAgentServiceLocal.setResponse("Agent1", "Response 1");
      AiAgentServiceLocal.setResponse("Agent2", "Response 2");
      AiAgentServiceLocal.clearResponses();
      const result1 = await service.createAndRun({ name: "Agent1", instructions: "Test", tools: [] }, { input: "Test" });
      const result2 = await service.createAndRun({ name: "Agent2", instructions: "Test", tools: [] }, { input: "Test" });
      expect(result1.output).toBe("Mock response for Agent1");
      expect(result2.output).toBe("Mock response for Agent2");
    });

    it("should clear all errors", async () => {
      AiAgentServiceLocal.setError("Agent1", "Error 1");
      AiAgentServiceLocal.setError("Agent2", "Error 2");
      AiAgentServiceLocal.clearErrors();
      const result1 = await service.createAndRun({ name: "Agent1", instructions: "Test", tools: [] }, { input: "Test" });
      const result2 = await service.createAndRun({ name: "Agent2", instructions: "Test", tools: [] }, { input: "Test" });
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it("should clear all overrides (responses and errors)", async () => {
      AiAgentServiceLocal.setResponse("Agent1", "Response");
      AiAgentServiceLocal.setError("Agent2", "Error");
      AiAgentServiceLocal.clearAllOverrides();
      const result1 = await service.createAndRun({ name: "Agent1", instructions: "Test", tools: [] }, { input: "Test" });
      const result2 = await service.createAndRun({ name: "Agent2", instructions: "Test", tools: [] }, { input: "Test" });
      expect(result1.success).toBe(true);
      expect(result1.output).toBe("Mock response for Agent1");
      expect(result2.success).toBe(true);
      expect(result2.output).toBe("Mock response for Agent2");
    });
  });

  describe("createAgent and runAgent methods", () => {
    it("should support the two-step createAgent + runAgent pattern", async () => {
      const agentConfig: AgentConfig<string> = { name: "TwoStepAgent", instructions: "Test agent", tools: [] };
      AiAgentServiceLocal.setResponse("TwoStepAgent", "Two-step response");
      const agent = service.createAgent(agentConfig);
      const result = await service.runAgent(agent, { input: "Test" });
      expect(result.success).toBe(true);
      expect(result.output).toBe("Two-step response");
    });
  });

  describe("Complex Multi-Phase Scenario", () => {
    it("should handle a realistic multi-phase agent workflow", async () => {
      const linkExtractionConfig: AgentConfig<{ links: string[] }> = {
        name: "TestAgent:extractLinks",
        instructions: "Extract links",
        outputSchema: z.object({ links: z.array(z.string()) }),
        tools: []
      };
      AiAgentServiceLocal.setResponse("TestAgent:extractLinks", {
        links: ["https://example.com/apply", "https://example.com/requirements"]
      });
      const linksResult = await service.createAndRun(linkExtractionConfig, { input: "Extract links from program page" });
      expect(linksResult.success).toBe(true);
      expect(linksResult.output.links).toHaveLength(2);

      const linkSummaryConfig: AgentConfig<string> = { name: "TestAgent:summarizeLink", instructions: "Summarize content", tools: [] };
      AiAgentServiceLocal.setResponses("TestAgent:summarizeLink", [
        "Application requires proof of income",
        "Must meet credit score requirements"
      ]);
      const summaries: string[] = [];
      for (const link of linksResult.output.links) {
        const summaryResult = await service.createAndRun(linkSummaryConfig, { input: `Summarize ${link}` });
        if (summaryResult.success) {
          summaries.push(summaryResult.output);
        }
      }
      expect(summaries).toHaveLength(2);
      expect(summaries[0]).toContain("proof of income");
      expect(summaries[1]).toContain("credit score");

      const webSearchConfig: AgentConfig<string> = { name: "TestAgent:searchWeb", instructions: "Search for program info", tools: [] };
      AiAgentServiceLocal.setResponse("TestAgent:searchWeb", "Program offers up to $10,000 in assistance");
      const searchResult = await service.createAndRun(webSearchConfig, { input: "Search for program details" });
      expect(searchResult.success).toBe(true);
      expect(searchResult.output).toContain("$10,000");

      const synthesisConfig: AgentConfig<{ steps: string[] }> = {
        name: "TestAgent:synthesizeFindings",
        instructions: "Synthesize findings",
        outputSchema: z.object({ steps: z.array(z.string()) }),
        tools: []
      };
      AiAgentServiceLocal.setResponse("TestAgent:synthesizeFindings", {
        steps: [
          "Gather proof of income documents",
          "Check your credit score",
          "Apply for up to $10,000 in assistance"
        ]
      });
      const synthesisResult = await service.createAndRun(synthesisConfig, {
        input: `Synthesize: ${summaries.join(", ")} and ${searchResult.output}`
      });
      expect(synthesisResult.success).toBe(true);
      expect(synthesisResult.output.steps).toHaveLength(3);
      expect(synthesisResult.output.steps[0]).toContain("proof of income");
    });
  });
});
