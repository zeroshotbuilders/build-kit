import { ConfigModule } from "@zeroshotbuilders/commons";
import { DynamicModule, Module } from "@nestjs/common";
import { OPENAI_APPLICATION_ROOT, OpenaiClientFactory } from "../index";
import { OpenaiClientConfig } from "./config/openai-client-config";

export const OPENAI_CLIENT = "OPENAI_CLIENT";

@Module({})
export class OpenaiClientModule {
  public static forApplicationRoot(applicationRoot: string): DynamicModule {
    return {
      module: OpenaiClientModule,
      imports: [ConfigModule.forApplicationRoot(applicationRoot)],
      providers: [
        {
          provide: OPENAI_APPLICATION_ROOT,
          useValue: applicationRoot
        },
        OpenaiClientConfig,
        OpenaiClientFactory,
        {
          provide: OPENAI_CLIENT,
          useFactory: (openaiClientFactory: OpenaiClientFactory) =>
            openaiClientFactory.makeOpenaiService(),
          inject: [OpenaiClientFactory]
        }
      ],
      exports: [OPENAI_CLIENT]
    };
  }
}
