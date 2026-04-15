import { ConfigModule } from "@zeroshotbuilders/commons";
import { DynamicModule, Module } from "@nestjs/common";
import { DOCLING_APPLICATION_ROOT } from "../index";
import { DoclingClientConfig } from "./config/docling-client-config";
import { DoclingClientFactory } from "./docling-client-factory";

export const DOCLING_CLIENT = "DOCLING_CLIENT";

@Module({})
export class DoclingClientModule {
  public static forApplicationRoot(applicationRoot: string): DynamicModule {
    return {
      module: DoclingClientModule,
      imports: [
        ConfigModule.forApplicationRoot(applicationRoot)
      ],
      providers: [
        {
          provide: DOCLING_APPLICATION_ROOT,
          useValue: applicationRoot
        },
        DoclingClientConfig,
        DoclingClientFactory,
        {
          provide: DOCLING_CLIENT,
          useFactory: (doclingClientFactory: DoclingClientFactory) =>
            doclingClientFactory.makeDoclingService(),
          inject: [DoclingClientFactory]
        }
      ],
      exports: [DOCLING_CLIENT]
    };
  }
}
