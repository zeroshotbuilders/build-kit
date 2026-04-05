import { ApplicationConfig } from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";
import { TavilyClientConfig } from "./config/tavily-client-config";
import { TavilyService } from "./service/tavily-service";
import { TavilyServiceLocal } from "./service/tavily-service-local";
import { TavilyServiceRemote } from "./service/tavily-service-remote";

@Injectable()
export class TavilyClientFactory {
  constructor(
    private readonly applicationConfig: ApplicationConfig,
    private readonly config: TavilyClientConfig
  ) {}

  public makeTavilyService(): TavilyService {
    if (this.applicationConfig.local) {
      return TavilyServiceLocal.getInstance();
    }
    return new TavilyServiceRemote(this.config);
  }
}
