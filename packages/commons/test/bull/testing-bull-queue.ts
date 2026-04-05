import { BullQueue, ApplicationConfig } from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";
import { RedisConnectionConfig } from "@zeroshotbuilders/commons";
import { Closer } from "@zeroshotbuilders/commons";

export type TestingBullJobRequest = {
  input: string;
  scenario: JobScenario;
  succeedAfterAttempts?: number;
  timeout?: number;
};

export type TestingBullJobResponse = {
  output: string;
  attemptsMade: number;
};

export enum JobScenario {
  RETRYABLE_ERROR,
  UNRECOVERABLE_ERROR,
  SUCCESS,
  TIMEOUT
}

export const TESTING_BULL_QUEUE = "testing-bull-queue";

@Injectable()
export class TestingBullQueue extends BullQueue<
  TestingBullJobRequest,
  TestingBullJobResponse
> {
  constructor(
    appConfig: ApplicationConfig,
    redisConnectionConfig: RedisConnectionConfig,
    closer: Closer
  ) {
    super(
      appConfig.applicationRoot,
      TESTING_BULL_QUEUE,
      redisConnectionConfig,
      closer
    );
  }
}
