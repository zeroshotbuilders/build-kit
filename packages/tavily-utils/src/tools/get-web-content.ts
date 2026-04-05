import { tool } from "@openai/agents";
import { TavilyService } from "../service/tavily-service";
import { z } from "zod";

const GetWebContentParametersSchema = z.object({
  urls: z
    .array(z.string())
    .describe("The URLs of the web pages to extract content from")
});

export type GetWebContentOptions = {
  tavilyService: TavilyService;
  maxContentLength?: number;
};

export const GET_WEB_CONTENT_TOOL_NAME = "get_web_content";

/**
 * Creates a tool that uses Tavily extract to fetch the contents of web pages.
 *
 * @param options Configuration options including the Tavily service
 * @returns A function tool that can be used with AI agents
 */
export function getWebContentTool(options: GetWebContentOptions) {
  const { tavilyService } = options;
  const maxContentLength = options.maxContentLength ?? 12000;

  const truncateContent = (content: string, maxLength: number): string => {
    if (content.length <= maxLength) {
      return content;
    }
    return `${content.slice(
      0,
      maxLength
    )}\n\n[Content truncated to ${maxLength} characters]`;
  };

  return tool({
    name: GET_WEB_CONTENT_TOOL_NAME,
    description:
      "Fetch and extract the content from one or more web pages. Returns the raw content of each page.",
    parameters: GetWebContentParametersSchema,
    execute: async (input) => {
      const response = await tavilyService.extract(input.urls, {
        format: "markdown"
      });

      const results = response.results.map((result) => ({
        url: result.url,
        content: truncateContent(result.rawContent, maxContentLength)
      }));

      const failedResults = response.failedResults.map((result) => ({
        url: result.url,
        error: result.error
      }));

      return JSON.stringify({
        results,
        failedResults
      });
    }
  });
}
