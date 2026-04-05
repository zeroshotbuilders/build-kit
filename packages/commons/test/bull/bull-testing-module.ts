import {
  BullModule,
  ConfigModule,
  RedisConnectionConfig
} from "@zeroshotbuilders/commons";
import { Closer } from "@zeroshotbuilders/commons";
import { BullTestingService } from "./bull-testing-service";
import { Module } from "@nestjs/common";
import { TestingBullQueue } from "./testing-bull-queue";
import { TestingBullWorker } from "./testing-bull-worker";

@Module({
  providers: [
    TestingBullQueue,
    TestingBullWorker,
    BullTestingService,
    RedisConnectionConfig,
    Closer
  ],
  imports: [
    ConfigModule.forApplicationRoot(__dirname),
    BullModule.forApplicationRoot(__dirname)
  ]
})
export class BullTestingModule {}
