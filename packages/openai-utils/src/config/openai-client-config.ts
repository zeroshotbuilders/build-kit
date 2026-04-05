import { ApplicationConfig, loadConfig } from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OpenaiClientConfig {
  private static readonly CONFIG_KEY = "openai";

  readonly apiToken: string;

  constructor(applicationConfig: ApplicationConfig) {
    const config = loadConfig<OpenaiClientConfig>(
      applicationConfig.applicationRoot,
      OpenaiClientConfig.CONFIG_KEY
    );

    return {
      apiToken: config.apiToken
    };
  }
}
