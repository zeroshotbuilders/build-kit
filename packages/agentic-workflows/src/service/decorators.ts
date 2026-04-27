import { timeFunction } from "@zeroshotbuilders/commons";
import { ModelSettings, Tool } from "@openai/agents";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { RepositorySession } from "../repository/session/repository-session";
import { AgentParameterMapper } from "./agent-parameter-mapper";
import {
  AgentConfig,
  AgentRunConfig,
  AgentRunResult,
  AiAgentService,
  ConsensusRunResult,
  ConsensusStrategy
} from "./ai-agent-service";
import {
  generateToolsReference,
  mapToolKeys,
  parsePromptFrontmatter,
  validateToolsMatch
} from "./prompt-utils";

/**
 * Customizable options for specifying Agentic Workflows
 * - promptsDirectory (optional): the directory to look for prompts in. If not specified, then each individual method
 *   must specify the prompt to execute. Should use `__dirname` to specify the directory so that it's relative to
 *   the workflow class.
 * - toolRegistry (optional): a registry mapping tool keys to tool names for use in frontmatter. If provided,
 *   prompts can declare tools using friendly keys instead of raw tool names.
 */
export type AgenticWorkflowOptions = {
  promptsDirectory?: string;
  toolRegistry?: Record<string, string>;
};

/**
 * Decorator for an Agentic Workflow class that contains AI agents
 * @param options the class-namespaced options for the workflow
 * @constructor
 */
export function AgenticWorkflow(
  options?: AgenticWorkflowOptions
): ClassDecorator {
  return function (target: any) {
    target.prototype.agenticWorkflowOptions = options;
  };
}

/**
 * Customizable options for specifying AI agents:
 * - name (optional): the name of the agent. If not specified, it will be derived from the class and method name (e.g. "ClassName:methodName")
 * - tools (optional): the tools available to the agent. Can be an array of tools or a function that returns an array of tools given the instance.
 * - model (optional): the model to use for the agent
 * - modelSettings (optional): the model settings for the agent
 * - outputSchema (optional): the output schema for the agent
 * - maxTurns (optional): maximum number of agentic turns. If not specified, defaults to 1 for agents
 *   without tools (since they should always complete in a single turn) or 5 for agents with tools.
 */
export type AgentOptions<T> = {
  name?: string;
  tools?: Tool[] | ((instance: any) => Tool[]);
  model?: string;
  modelSettings?: ModelSettings;
  outputSchema?: T extends string ? undefined : z.ZodType<T>;
  maxTurns?: number;
  /** Name of the method parameter that contains the git branch to checkout before running. */
  branchParam?: string;
};

/**
 * Options for ConsensusAgent, extending AgentOptions with multi-run consensus configuration.
 */
export type ConsensusAgentOptions<T> = AgentOptions<T> & {
  /** Number of concurrent runs. Must be odd. */
  runs: number;
  /** Strategy for resolving consensus across runs. */
  consensusStrategy: ConsensusStrategy;
  /**
   * Judge function, required when consensusStrategy is JUDGE.
   * Receives the class instance and all successful run results, returns the winning result.
   * Typically delegates to another @Agent method on the same class.
   */
  judge?: (
    instance: any,
    results: AgentRunResult<T>[]
  ) => Promise<AgentRunResult<T>>;
  /**
   * Optional [min, max] temperature range. If provided, each run gets a linearly
   * interpolated temperature across the range. If omitted, all runs use the same
   * temperature from modelSettings.
   */
  temperatureSpread?: [number, number];
};

// -- Shared helpers for @Agent and @ConsensusAgent --

interface PreparedAgentExecution<T> {
  aiAgentService: AiAgentService;
  agentConfig: AgentConfig<T>;
  runConfig: AgentRunConfig;
}

function prepareAgentExecution<T>(
  parentInstance: any,
  target: any,
  propertyKey: string | symbol,
  options: AgentOptions<T>,
  parameterMapper: AgentParameterMapper,
  args: any[]
): PreparedAgentExecution<T> {
  const aiAgentService: AiAgentService = parentInstance.aiAgentService;

  if (!aiAgentService) {
    throw new Error(
      "aiAgentService not found on the class instance. Make sure it is injected as 'aiAgentService'."
    );
  }

  const promptsDirectory =
    parentInstance.agenticWorkflowOptions?.promptsDirectory;
  if (!promptsDirectory) {
    throw new Error("promptsDirectory not specified in @AgenticWorkflow");
  }

  const filePath = path.join(
    promptsDirectory,
    `${propertyKey.toString()}.md`
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt file not found: ${filePath}`);
  }
  const rawMarkdown = fs.readFileSync(filePath, "utf-8");

  const { frontmatter, content } = parsePromptFrontmatter(rawMarkdown);

  const tools =
    typeof options.tools === "function"
      ? options.tools(parentInstance)
      : options.tools;

  const toolRegistry = parentInstance.agenticWorkflowOptions?.toolRegistry;
  if (frontmatter.tools && frontmatter.tools.length > 0) {
    if (toolRegistry) {
      const declaredToolNames = mapToolKeys(frontmatter.tools, toolRegistry);
      if (tools) {
        validateToolsMatch(declaredToolNames, tools);
      }
    }
  }

  const toolsReference = tools ? generateToolsReference(tools) : "";
  const instructions = toolsReference + content;

  const agentName =
    options.name ?? `${target.constructor.name}:${propertyKey.toString()}`;

  const agentConfig: AgentConfig<T> = {
    name: agentName,
    instructions,
    tools,
    model: options.model,
    modelSettings: options.modelSettings,
    outputSchema: options.outputSchema
  };

  const { input, context } = parameterMapper.mapArguments(args);

  const maybeSession: RepositorySession = args.find(
    (arg) => arg instanceof RepositorySession
  );

  let branch: string | undefined;
  if (options.branchParam) {
    const paramNames = parameterMapper.getParameterNames();
    const branchIdx = paramNames.indexOf(options.branchParam);
    if (branchIdx >= 0 && typeof args[branchIdx] === "string") {
      branch = args[branchIdx];
    }
  }

  const hasTools = tools && tools.length > 0;
  const maxTurns = options.maxTurns ?? (hasTools ? 8 : 1);

  const runConfig: AgentRunConfig = {
    input,
    context,
    session: maybeSession,
    maxTurns,
    branch
  };

  return { aiAgentService, agentConfig, runConfig };
}

/**
 * Decorator for a class method that executes an AI agent
 * @param options
 * @constructor
 */
export function Agent<T>(options: AgentOptions<T>): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const parameterMapper = AgentParameterMapper.create(originalMethod);

    descriptor.value = async function (
      ...args: any[]
    ): Promise<AgentRunResult<T>> {
      const { aiAgentService, agentConfig, runConfig } =
        prepareAgentExecution(this, target, propertyKey, options, parameterMapper, args);

      return timeFunction(
        () => aiAgentService.createAndRun(agentConfig, runConfig),
        agentConfig.name
      );
    };
  };
}

/**
 * Resolves consensus from multiple agent run results using the specified strategy.
 */
function resolveConsensus<T>(
  results: AgentRunResult<T>[],
  allResults: AgentRunResult<T>[],
  strategy: ConsensusStrategy
): ConsensusRunResult<T> {
  const totalRuns = allResults.length;
  const successfulRuns = results.length;

  if (successfulRuns === 0) {
    return {
      output: undefined as any,
      success: false,
      error: "All runs failed — no outputs to compare",
      runs: allResults,
      agreement: 0,
      totalRuns,
      successfulRuns: 0
    };
  }

  if (strategy === ConsensusStrategy.MAJORITY) {
    const groups = new Map<string, AgentRunResult<T>[]>();
    for (const result of results) {
      const key = JSON.stringify(result.output);
      const group = groups.get(key) || [];
      group.push(result);
      groups.set(key, group);
    }

    let largestGroup: AgentRunResult<T>[] = [];
    for (const group of groups.values()) {
      if (group.length > largestGroup.length) {
        largestGroup = group;
      }
    }

    return {
      output: largestGroup[0].output,
      success: true,
      runs: allResults,
      agreement: largestGroup.length / successfulRuns,
      totalRuns,
      successfulRuns
    };
  }

  if (strategy === ConsensusStrategy.UNANIMOUS) {
    const firstOutput = JSON.stringify(results[0].output);
    const allAgree = results.every(
      (r) => JSON.stringify(r.output) === firstOutput
    );

    if (!allAgree) {
      return {
        output: undefined as any,
        success: false,
        error: "Unanimous consensus not reached — outputs differ",
        runs: allResults,
        agreement: 0,
        totalRuns,
        successfulRuns
      };
    }

    return {
      output: results[0].output,
      success: true,
      runs: allResults,
      agreement: 1,
      totalRuns,
      successfulRuns
    };
  }

  // JUDGE strategy is handled in the decorator itself since it needs the instance
  throw new Error(`Unexpected consensus strategy: ${strategy}`);
}

/**
 * Decorator for a class method that executes an AI agent multiple times concurrently
 * and resolves the outputs into a single consensus result.
 * @param options
 * @constructor
 */
export function ConsensusAgent<T>(
  options: ConsensusAgentOptions<T>
): MethodDecorator {
  if (options.runs % 2 === 0) {
    throw new Error(
      `ConsensusAgent requires an odd number of runs, got ${options.runs}`
    );
  }

  if (
    options.consensusStrategy === ConsensusStrategy.JUDGE &&
    !options.judge
  ) {
    throw new Error(
      "ConsensusAgent with JUDGE strategy requires a judge function"
    );
  }

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const parameterMapper = AgentParameterMapper.create(originalMethod);

    descriptor.value = async function (
      ...args: any[]
    ): Promise<ConsensusRunResult<T>> {
      const { aiAgentService, agentConfig, runConfig } =
        prepareAgentExecution(this, target, propertyKey, options, parameterMapper, args);

      const runPromises: Promise<AgentRunResult<T>>[] = [];

      for (let i = 0; i < options.runs; i++) {
        // Build per-run config, potentially varying temperature
        let perRunAgentConfig = agentConfig;
        if (options.temperatureSpread) {
          const [minTemp, maxTemp] = options.temperatureSpread;
          const t =
            options.runs === 1
              ? minTemp
              : minTemp + (maxTemp - minTemp) * (i / (options.runs - 1));
          perRunAgentConfig = {
            ...agentConfig,
            modelSettings: {
              ...agentConfig.modelSettings,
              temperature: t
            }
          };
        }

        runPromises.push(
          aiAgentService.createAndRun(perRunAgentConfig, runConfig)
        );
      }

      const allResults = await timeFunction(
        () => Promise.all(runPromises),
        `${agentConfig.name}:consensus(${options.runs})`
      );

      const successfulResults = allResults.filter((r) => r.success);

      // For JUDGE strategy, delegate to the user-provided judge function
      if (options.consensusStrategy === ConsensusStrategy.JUDGE) {
        if (successfulResults.length === 0) {
          return {
            output: undefined as any,
            success: false,
            error: "All runs failed — no outputs for judge to evaluate",
            runs: allResults,
            agreement: 0,
            totalRuns: options.runs,
            successfulRuns: 0
          };
        }

        const judgeResult = await options.judge!(this, successfulResults);
        return {
          ...judgeResult,
          runs: allResults,
          agreement: 0, // Judge doesn't produce a numeric agreement
          totalRuns: options.runs,
          successfulRuns: successfulResults.length
        };
      }

      return resolveConsensus(
        successfulResults,
        allResults,
        options.consensusStrategy
      );
    };
  };
}
