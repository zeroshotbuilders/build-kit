import { Tool } from "@openai/agents";

export type PromptFrontmatter = {
  tools?: string[];
};

export type ParsedPrompt = {
  frontmatter: PromptFrontmatter;
  content: string;
};

/**
 * Parses frontmatter from a markdown file.
 * Expects YAML frontmatter delimited by --- at the start of the file.
 */
export function parsePromptFrontmatter(markdown: string): ParsedPrompt {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      content: markdown
    };
  }

  const frontmatterText = match[1];
  const content = match[2];

  // Simple YAML parser for our specific use case (tools array)
  const frontmatter: PromptFrontmatter = {};

  // Parse tools array
  const toolsMatch = frontmatterText.match(/tools:\s*\n((?:\s+-\s+.+\n?)*)/);
  if (toolsMatch) {
    const toolsText = toolsMatch[1];
    const tools = toolsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"))
      .map((line) => line.substring(1).trim())
      .filter(Boolean);
    frontmatter.tools = tools;
  }

  return {
    frontmatter,
    content
  };
}

/**
 * Generates a tools reference section to be injected into the prompt.
 * This documents the available tools and their usage for the agent.
 */
export function generateToolsReference(tools: Tool[]): string {
  if (!tools || tools.length === 0) {
    return "";
  }

  const toolDocs = tools
    .map((tool) => {
      const anyTool = tool as any;
      const params = (tool as any).parameters;
      let paramsDoc = "";

      if (params && params._def && params._def.shape) {
        const shape = params._def.shape();
        const paramNames = Object.keys(shape);
        if (paramNames.length > 0) {
          const paramsList = paramNames
            .map((name) => {
              const field = shape[name];
              const desc = field._def.description;
              return `  - ${name}: ${desc || "parameter"}`;
            })
            .join("\n");
          paramsDoc = `\nParameters:\n${paramsList}`;
        }
      }

      return `## ${anyTool.name}\n${anyTool.description || ""}${paramsDoc}`;
    })
    .join("\n\n");

  return `# Available Tools\n\nYou have access to the following tools:\n\n${toolDocs}\n\n---\n\n`;
}

/**
 * Maps tool keys from frontmatter to actual tool names using a registry.
 * Validates that all referenced tool keys exist in the registry.
 */
export function mapToolKeys(
  toolKeys: string[],
  registry: Record<string, string>
): string[] {
  const toolNames: string[] = [];
  const invalidKeys: string[] = [];

  for (const key of toolKeys) {
    if (key in registry) {
      toolNames.push(registry[key]);
    } else {
      invalidKeys.push(key);
    }
  }

  if (invalidKeys.length > 0) {
    throw new Error(
      `Invalid tool keys in frontmatter: ${invalidKeys.join(", ")}. ` +
        `Available keys: ${Object.keys(registry).join(", ")}`
    );
  }

  return toolNames;
}

/**
 * Validates that tools provided to the agent match the tools declared in frontmatter.
 */
export function validateToolsMatch(
  declaredToolNames: string[],
  actualTools: Tool[]
): void {
  const actualToolNames = actualTools.map((t) => t.name);

  // Check that all declared tools are provided
  const missingTools = declaredToolNames.filter(
    (name) => !actualToolNames.includes(name)
  );
  if (missingTools.length > 0) {
    throw new Error(
      `Tools declared in frontmatter but not provided to agent: ${missingTools.join(
        ", "
      )}`
    );
  }

  // Check that all provided tools are declared
  const extraTools = actualToolNames.filter(
    (name) => !declaredToolNames.includes(name)
  );
  if (extraTools.length > 0) {
    throw new Error(
      `Tools provided to agent but not declared in frontmatter: ${extraTools.join(
        ", "
      )}. ` + `Add these to the frontmatter 'tools' list.`
    );
  }
}
