import {
  ExtractOptions,
  ExtractResponse,
  SearchOptions,
  SearchResponse,
  TavilyService
} from "./tavily-service";

export class TavilyServiceLocal implements TavilyService {
  private static instance: TavilyServiceLocal = new TavilyServiceLocal();

  private static extractOverride:
    | ((urls: string[], options?: ExtractOptions) => Promise<ExtractResponse>)
    | undefined;

  private static searchOverride:
    | ((query: string, options?: SearchOptions) => Promise<SearchResponse>)
    | undefined;

  public static getInstance(): TavilyServiceLocal {
    return TavilyServiceLocal.instance;
  }

  public static setExtractOverride(
    override: (
      urls: string[],
      options?: ExtractOptions
    ) => Promise<ExtractResponse>
  ): void {
    this.extractOverride = override;
  }

  public static setSearchOverride(
    override: (
      query: string,
      options?: SearchOptions
    ) => Promise<SearchResponse>
  ): void {
    this.searchOverride = override;
  }

  public static clearExtractOverride(): void {
    this.extractOverride = undefined;
  }

  public static clearSearchOverride(): void {
    this.searchOverride = undefined;
  }

  public static clearAllOverrides(): void {
    this.extractOverride = undefined;
    this.searchOverride = undefined;
  }

  async extract(
    urls: string[],
    options?: ExtractOptions
  ): Promise<ExtractResponse> {
    if (TavilyServiceLocal.extractOverride) {
      return TavilyServiceLocal.extractOverride(urls, options);
    }

    return {
      results: urls.map((url) => ({
        url,
        rawContent: `Mock content for ${url}`
      })),
      failedResults: []
    };
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    if (TavilyServiceLocal.searchOverride) {
      return TavilyServiceLocal.searchOverride(query, options);
    }

    const maxResults = options?.maxResults ?? 5;
    return {
      answer: options?.includeAnswer ? `Mock answer for: ${query}` : undefined,
      results: Array.from({ length: maxResults }, (_, i) => ({
        title: `Mock Result ${i + 1} for ${query}`,
        url: `https://example.com/result-${i + 1}`,
        content: `Mock content snippet ${i + 1} for query: ${query}`,
        score: 1 - i * 0.1
      }))
    };
  }
}
