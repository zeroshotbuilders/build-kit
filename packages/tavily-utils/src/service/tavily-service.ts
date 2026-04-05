export interface ExtractResult {
  url: string;
  rawContent: string;
}

export interface ExtractFailedResult {
  url: string;
  error: string;
}

export interface ExtractResponse {
  results: ExtractResult[];
  failedResults: ExtractFailedResult[];
}

export interface ExtractOptions {
  format?: "markdown" | "text";
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface SearchResponse {
  answer?: string;
  results: SearchResult[];
}

export interface SearchOptions {
  maxResults?: number;
  includeAnswer?: boolean;
}

export interface TavilyService {
  extract(urls: string[], options?: ExtractOptions): Promise<ExtractResponse>;
  search(query: string, options?: SearchOptions): Promise<SearchResponse>;
}
