import {
  ConvertOptions,
  ConvertRequest,
  ConvertResponse,
  DoclingService
} from "./docling-service";

export class DoclingServiceLocal implements DoclingService {
  private static instance: DoclingServiceLocal = new DoclingServiceLocal();

  private static convertOverride:
    | ((
        request: ConvertRequest,
        options?: ConvertOptions
      ) => Promise<ConvertResponse>)
    | undefined;

  public static getInstance(): DoclingServiceLocal {
    return DoclingServiceLocal.instance;
  }

  public static setConvertOverride(
    override: (
      request: ConvertRequest,
      options?: ConvertOptions
    ) => Promise<ConvertResponse>
  ): void {
    this.convertOverride = override;
  }

  public static clearConvertOverride(): void {
    this.convertOverride = undefined;
  }

  public static clearAllOverrides(): void {
    this.convertOverride = undefined;
  }

  async convert(
    request: ConvertRequest,
    options?: ConvertOptions
  ): Promise<ConvertResponse> {
    if (DoclingServiceLocal.convertOverride) {
      return DoclingServiceLocal.convertOverride(request, options);
    }

    return {
      content: `Mock converted content for ${request.filename}`,
      format: options?.format ?? "markdown",
      pages: 1
    };
  }
}
