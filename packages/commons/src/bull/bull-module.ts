import { DynamicModule, Module } from "@nestjs/common";
import {
  RedisConnectionModule,
  REDIS_CONFIG_ROOT
} from "@zeroshotbuilders/commons";

@Module({})
export class BullModule {
  public static forApplicationRoot(applicationRoot: string): DynamicModule {
    return {
      module: BullModule,
      imports: [RedisConnectionModule.forApplicationRoot(applicationRoot)],
      providers: [
        {
          provide: REDIS_CONFIG_ROOT,
          useValue: applicationRoot
        }
      ],
      exports: [REDIS_CONFIG_ROOT]
    };
  }
}
