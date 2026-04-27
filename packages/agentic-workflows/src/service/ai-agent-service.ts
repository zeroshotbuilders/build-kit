import type {InputGuardrail, ModelSettings, Session, UnknownContext} from "@openai/agents";
import {Agent, Tool} from "@openai/agents";
import {z} from "zod";

/**
 * Configuration for an AI agent run
 */
export interface AgentRunConfig {
  /** The input message/prompt to send to the agent */
  input: string;
  /** Optional context to provide to the agent */
  context?: Record<string, unknown>;
  /** Optional session for conversation history */
  session?: Session;
  /** Maximum number of agentic turns before stopping. Defaults to 10 in the SDK. */
  maxTurns?: number;
  /** Optional git branch to fetch and checkout after cloning. Used by Codex CLI service. */
  branch?: string;
}

/**
 * Result from an AI agent run
 */
export interface AgentRunResult<T = any> {
  /** The final output from the agent */
  output: T;
  /** Whether the run completed successfully */
  success: boolean;
  /** Any error message if the run failed */
  error?: string;
  /** The raw result from the underlying SDK (for advanced use cases) */
  rawResult?: unknown;
  /** Path to the git repo working directory. When set, the caller is responsible for cleanup. */
  workingDir?: string;
}

/**
 * Strategy for resolving consensus across multiple agent runs
 */
export enum ConsensusStrategy {
  /** Most common output wins (uses equality comparison). Requires odd number of runs. */
  MAJORITY = "majority",
  /** All runs must produce the same output or the consensus fails. */
  UNANIMOUS = "unanimous",
  /** A user-provided judge function decides the winning output. */
  JUDGE = "judge"
}

/**
 * Result from a consensus agent run, extending AgentRunResult with multi-run metadata
 */
export interface ConsensusRunResult<T = any> extends AgentRunResult<T> {
  /** All individual run results (including failures) */
  runs: AgentRunResult<T>[];
  /** Fraction of successful runs that agreed with the winning output (e.g. 0.8 = 4/5) */
  agreement: number;
  /** Total number of runs requested */
  totalRuns: number;
  /** Number of runs that completed successfully */
  successfulRuns: number;
}

/**
 * Configuration for creating an AI agent
 */
export interface AgentConfig<T = any> {
  /** Name of the agent */
  name: string;
  /** Instructions/system prompt for the agent */
  instructions: string;
  /** Model to use (e.g., "gpt-4o", "llama2") */
  model?: string;
  /** Tools available to the agent */
  tools?: Tool[];
  /** Output schema for the agent */
  outputSchema?: T extends string ? undefined : z.ZodType<T>;
  /** Model settings (e.g., toolChoice, temperature) */
  modelSettings?: ModelSettings;
  /** Input guardrails that run checks on the input before the agent processes it */
  inputGuardrails?: InputGuardrail[];
}

/**
 * Helper type for Agent with Zod output type
 */
export type AgentType<T> = Agent<UnknownContext, any>;

/**
 * Interface for AI agent services that abstracts the underlying provider.
 * Implementations can use OpenAI, Ollama, or other providers.
 */
export interface AiAgentService {
  /**
   * Creates an agent with the given configuration
   */
  createAgent<T>(config: AgentConfig<T>): AgentType<T>;

  /**
   * Runs an agent with the given input and returns the result
   */
  runAgent<T>(
    agent: AgentType<T>,
    config: AgentRunConfig
  ): Promise<AgentRunResult<T>>;

  /**
   * Convenience method to create and run an agent in one call
   */
  createAndRun<T>(
    agentConfig: AgentConfig<T>,
    runConfig: AgentRunConfig
  ): Promise<AgentRunResult<T>>;
}
