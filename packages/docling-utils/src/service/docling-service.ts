export interface ConvertRequest {
  file: Buffer;
  filename: string;
}

export interface ConvertOptions {
  format?: "markdown" | "text" | "json";
}

export interface ConvertResponse {
  content: string;
  format: string;
  pages: number;
}

export interface DoclingService {
  convert(
    request: ConvertRequest,
    options?: ConvertOptions
  ): Promise<ConvertResponse>;
}
