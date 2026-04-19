import { ApplicationConfig, loadConfig } from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";

@Injectable()
export class DoclingClientConfig {
  private static readonly CONFIG_KEY = "docling";

  readonly baseUrl: string;

  constructor(applicationConfig: ApplicationConfig) {
    const config = loadConfig<DoclingClientConfig>(
      applicationConfig.applicationRoot,
      DoclingClientConfig.CONFIG_KEY
    );

    return {
      baseUrl: config.baseUrl
    };
  }
}
