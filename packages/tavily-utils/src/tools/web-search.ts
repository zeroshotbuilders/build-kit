import { TavilyService } from "../service/tavily-service";
import { tool } from "@openai/agents";
import { z } from "zod";

const WebSearchParametersSchema = z.object({
  query: z.string().describe("The search query to look up on the web"),
  maxResults: z
    .number()
    .default(5)
    .describe("Maximum number of results to return (default: 5)")
});

export type WebSearchOptions = {
  tavilyService: TavilyService;
  maxResults?: number;
};

export const WEB_SEARCH_TOOL_NAME = "web_search";

/**
 * Creates a web search tool that uses Tavily to search the web for a given query.
 *
 * @param options Configuration options including the Tavily service
 * @returns A function tool that can be used with AI agents
 */
export function webSearchTool(options: WebSearchOptions) {
  const { tavilyService } = options;

  return tool({
    name: WEB_SEARCH_TOOL_NAME,
    description:
      "Search the web for information about a given query. Returns relevant search results with titles, URLs, and content snippets.",
    parameters: WebSearchParametersSchema,
    execute: async (input) => {
      const response = await tavilyService.search(input.query, {
        maxResults: input.maxResults ?? options.maxResults ?? 5,
        includeAnswer: true
      });

      const results = response.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score
      }));

      return JSON.stringify({
        answer: response.answer,
        results
      });
    }
  });
}
