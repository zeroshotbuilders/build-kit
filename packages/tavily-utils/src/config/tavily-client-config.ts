import { ApplicationConfig, loadConfig } from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TavilyClientConfig {
  private static readonly CONFIG_KEY = "tavily";

  readonly apiToken: string;

  constructor(applicationConfig: ApplicationConfig) {
    const config = loadConfig<TavilyClientConfig>(
      applicationConfig.applicationRoot,
      TavilyClientConfig.CONFIG_KEY
    );

    return {
      apiToken: config.apiToken
    };
  }
}
