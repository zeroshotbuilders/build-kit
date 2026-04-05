import { ApplicationConfig } from "@zeroshotbuilders/commons";
import {
  OpenaiService,
  OpenaiServiceLocal,
  OpenaiServiceRemote
} from "@zeroshotbuilders/openai-utils";
import { Injectable } from "@nestjs/common";
import { OpenaiClientConfig } from "./config/openai-client-config";

@Injectable()
export class OpenaiClientFactory {
  constructor(
    private readonly applicationConfig: ApplicationConfig,
    private readonly config: OpenaiClientConfig
  ) {}

  public makeOpenaiService(): OpenaiService {
    if (this.applicationConfig.local) {
      return OpenaiServiceLocal.getInstance();
    }
    return new OpenaiServiceRemote(this.config);
  }
}
