import { createLogger, transports } from "winston";
import { DoclingClientConfig } from "../config/docling-client-config";
import {
  ConvertOptions,
  ConvertRequest,
  ConvertResponse,
  DoclingService
} from "./docling-service";

export class DoclingServiceRemote implements DoclingService {
  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });

  private readonly baseUrl: string;

  constructor(config: DoclingClientConfig) {
    this.baseUrl = config.baseUrl;
  }

  async convert(
    request: ConvertRequest,
    options?: ConvertOptions
  ): Promise<ConvertResponse> {
    const format = options?.format ?? "markdown";

    const formData = new FormData();
    formData.append(
      "files",
      new Blob([request.file]),
      request.filename
    );

    const response = await fetch(
      `${this.baseUrl}/v1/convert/file`,
      {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Docling conversion failed (${response.status}): ${body}`
      );
    }

    const result = await response.json() as any;
    const document = result.document ?? result;

    const content = this.extractContent(document, format);

    return {
      content,
      format,
      pages: document.pages?.length ?? document.num_pages ?? 1
    };
  }

  private extractContent(document: any, format: string): string {
    if (format === "markdown" && document.md_content) {
      return document.md_content;
    }
    if (format === "text" && document.text_content) {
      return document.text_content;
    }
    if (document.export_to_markdown) {
      return document.export_to_markdown;
    }
    if (document.content) {
      return typeof document.content === "string"
        ? document.content
        : JSON.stringify(document.content);
    }
    return JSON.stringify(document);
  }
}
