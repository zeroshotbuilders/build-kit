import { GET_WEB_CONTENT_TOOL_NAME } from "./get-web-content";
import { WEB_SEARCH_TOOL_NAME } from "./web-search";

/**
 * Registry of common tools available across all agents.
 * Maps human-friendly keys to actual tool names.
 */
export const COMMON_TOOL_REGISTRY = {
  webSearch: WEB_SEARCH_TOOL_NAME,
  webContent: GET_WEB_CONTENT_TOOL_NAME
} as const;

export type CommonToolKey = keyof typeof COMMON_TOOL_REGISTRY;

export * from "./get-web-content";
export * from "./web-search";
