import { ApplicationConfig } from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";
import { DoclingClientConfig } from "./config/docling-client-config";
import { DoclingService } from "./service/docling-service";
import { DoclingServiceLocal } from "./service/docling-service-local";
import { DoclingServiceRemote } from "./service/docling-service-remote";

@Injectable()
export class DoclingClientFactory {
  constructor(
    private readonly applicationConfig: ApplicationConfig,
    private readonly config: DoclingClientConfig
  ) {}

  public makeDoclingService(): DoclingService {
    if (this.applicationConfig.local) {
      return DoclingServiceLocal.getInstance();
    }
    return new DoclingServiceRemote(this.config);
  }
}
