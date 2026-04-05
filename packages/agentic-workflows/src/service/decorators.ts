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
  AiAgentService
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
      const parentInstance = this as any;
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

      // Parse frontmatter from the markdown file
      const { frontmatter, content } = parsePromptFrontmatter(rawMarkdown);

      const tools =
        typeof options.tools === "function"
          ? options.tools(parentInstance)
          : options.tools;

      // If frontmatter declares tools and a registry is provided, validate
      const toolRegistry = parentInstance.agenticWorkflowOptions?.toolRegistry;
      if (frontmatter.tools && frontmatter.tools.length > 0) {
        if (toolRegistry) {
          // Map tool keys to tool names and validate
          const declaredToolNames = mapToolKeys(
            frontmatter.tools,
            toolRegistry
          );
          if (tools) {
            validateToolsMatch(declaredToolNames, tools);
          }
        }
      }

      // Generate tools reference documentation and inject it into instructions
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

      // Extract branch from the named parameter if branchParam is specified
      let branch: string | undefined;
      if (options.branchParam) {
        const paramNames = parameterMapper.getParameterNames();
        const branchIdx = paramNames.indexOf(options.branchParam);
        if (branchIdx >= 0 && typeof args[branchIdx] === "string") {
          branch = args[branchIdx];
        }
      }

      // Default maxTurns: 1 for agents without tools (they complete in a single turn),
      // 8 for agents with tools (to allow for multi-step tool call + response cycles)
      const hasTools = tools && tools.length > 0;
      const maxTurns = options.maxTurns ?? (hasTools ? 8 : 1);

      const runConfig: AgentRunConfig = {
        input,
        context,
        session: maybeSession,
        maxTurns,
        branch
      };

      return timeFunction(
        () => aiAgentService.createAndRun(agentConfig, runConfig),
        agentConfig.name
      );
    };
  };
}
