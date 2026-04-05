import {APPLICATION_ROOT, ApplicationConfig,} from "@zeroshotbuilders/commons";
import {DynamicModule, Module} from "@nestjs/common";

@Module({})
export class ConfigModule {
  public static forApplicationRoot(applicationRoot: string): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        ApplicationConfig,
        {
          provide: APPLICATION_ROOT,
          useValue: applicationRoot
        }
      ],
      exports: [ApplicationConfig, APPLICATION_ROOT]
    };
  }
}
