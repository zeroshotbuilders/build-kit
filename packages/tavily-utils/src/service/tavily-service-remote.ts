import { tavily } from "@tavily/core";
import { TavilyClientConfig } from "../config/tavily-client-config";
import {
  ExtractOptions,
  ExtractResponse,
  SearchOptions,
  SearchResponse,
  TavilyService
} from "./tavily-service";

export class TavilyServiceRemote implements TavilyService {
  private readonly client: ReturnType<typeof tavily>;

  constructor(config: TavilyClientConfig) {
    this.client = tavily({ apiKey: config.apiToken });
  }

  async extract(
    urls: string[],
    options?: ExtractOptions
  ): Promise<ExtractResponse> {
    const response = await this.client.extract(urls, {
      format: options?.format
    });

    return {
      results: response.results.map((result) => ({
        url: result.url,
        rawContent: result.rawContent
      })),
      failedResults: response.failedResults.map((result) => ({
        url: result.url,
        error: result.error
      }))
    };
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    const response = await this.client.search(query, {
      maxResults: options?.maxResults,
      includeAnswer: options?.includeAnswer
    });

    return {
      answer: response.answer,
      results: response.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score
      }))
    };
  }
}
