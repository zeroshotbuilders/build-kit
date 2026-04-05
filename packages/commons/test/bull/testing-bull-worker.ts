import {
  BullWorker,
  Closer,
  RedisConnectionConfig
} from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";
import {
  JobScenario,
  TESTING_BULL_QUEUE,
  TestingBullJobRequest,
  TestingBullJobResponse
} from "./testing-bull-queue";
import { match } from "ts-pattern";

@Injectable()
export class TestingBullWorker extends BullWorker<
  TestingBullJobRequest,
  TestingBullJobResponse
> {
  public static readonly PROCESSING_SUFFIX = " - processed";

  constructor(redisConnectionConfig: RedisConnectionConfig, closer: Closer) {
    super(TESTING_BULL_QUEUE, redisConnectionConfig, closer);
  }

  async run(
    job: Job<TestingBullJobRequest, TestingBullJobResponse>,
    signal?: AbortSignal
  ): Promise<TestingBullJobResponse> {
    this.logger.info("Attempting to run a job", {
      counter: job.attemptsMade
    });
    return match(job.data.scenario)
      .when(
        (scenario) => scenario === JobScenario.RETRYABLE_ERROR,
        (): TestingBullJobResponse => {
          if (job.attemptsMade === job.data.succeedAfterAttempts) {
            return {
              output: job.data.input + TestingBullWorker.PROCESSING_SUFFIX,
              attemptsMade: job.attemptsMade
            };
          }
          throw new Error("Transient error");
        }
      )
      .when(
        (scenario) => scenario === JobScenario.UNRECOVERABLE_ERROR,
        () => {
          throw new UnrecoverableError("GG");
        }
      )
      .when(
        (scenario) => scenario === JobScenario.TIMEOUT,
        async () => {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 10000);
            signal?.addEventListener("abort", () => {
              clearTimeout(timeout);
              const err = new Error("AbortError");
              err.name = "AbortError";
              reject(err);
            });
          });
          return {
            output: job.data.input + TestingBullWorker.PROCESSING_SUFFIX,
            attemptsMade: job.attemptsMade
          };
        }
      )
      .otherwise((): TestingBullJobResponse => {
        return {
          output: job.data.input + TestingBullWorker.PROCESSING_SUFFIX,
          attemptsMade: job.attemptsMade
        };
      });
  }
}
