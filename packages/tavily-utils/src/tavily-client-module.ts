import {
  ConfigModule,
  ApplicationConfig
} from "@zeroshotbuilders/commons";
import { DynamicModule, Module } from "@nestjs/common";
import { TAVILY_APPLICATION_ROOT } from "../index";
import { TavilyClientConfig } from "./config/tavily-client-config";
import { TavilyClientFactory } from "./tavily-client-factory";

export const TAVILY_CLIENT = "TAVILY_CLIENT";

@Module({})
export class TavilyClientModule {
  public static forApplicationRoot(applicationRoot: string): DynamicModule {
    return {
      module: TavilyClientModule,
      imports: [
        ConfigModule.forApplicationRoot(applicationRoot)
      ],
      providers: [
        {
          provide: TAVILY_APPLICATION_ROOT,
          useValue: applicationRoot
        },
        TavilyClientConfig,
        TavilyClientFactory,
        {
          provide: TAVILY_CLIENT,
          useFactory: (tavilyClientFactory: TavilyClientFactory) =>
            tavilyClientFactory.makeTavilyService(),
          inject: [TavilyClientFactory]
        }
      ],
      exports: [TAVILY_CLIENT]
    };
  }
}
