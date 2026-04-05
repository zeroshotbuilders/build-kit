import { APPLICATION_ROOT, loadConfig } from "@zeroshotbuilders/commons";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ApplicationConfig {
  local!: boolean;
  port: number;
  applicationRoot: string;
  useRemoteSecrets: boolean;

  constructor(@Inject(APPLICATION_ROOT) applicationRoot?: string) {
    if (applicationRoot) {
      const config = {
        ...loadConfig<ApplicationConfig>(applicationRoot),
        applicationRoot: applicationRoot
      };
      this.local = config.local;
      this.port = config.port;
      this.applicationRoot = config.applicationRoot;
      this.useRemoteSecrets = config.useRemoteSecrets || false;
    }
  }

  static create(
    local: boolean,
    port: number,
    applicationRoot?: string
  ): ApplicationConfig {
    const config = new ApplicationConfig();
    config.local = local;
    config.port = port;
    config.applicationRoot = applicationRoot;
    return config;
  }
}
