import { Closer, RedisConnectionConfig } from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";
import { Job, UnrecoverableError, Worker } from "bullmq";
import { createLogger, Logger, transports } from "winston";

@Injectable()
export abstract class BullWorker<JobRequest, JobResult> {
  private readonly worker: Worker<JobRequest, JobResult>;
  protected readonly logger: Logger = createLogger({
    transports: [new transports.Console()]
  });

  constructor(
    queueName: string,
    redisConnectionConfig: RedisConnectionConfig,
    closer: Closer,
    concurrency = 1,
    private readonly timeout?: number
  ) {
    this.worker = new Worker<JobRequest, JobResult>(
      queueName,
      async (job) => {
        const jobTimeout = (job.data as any)?.timeout ?? this.timeout;
        if (jobTimeout) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), jobTimeout);
          try {
            return await this.run(job, controller.signal);
          } catch (err: any) {
            if (err.name === "AbortError") {
              throw new UnrecoverableError(
                `Job ${job.id} timed out after ${jobTimeout}ms`
              );
            }
            throw err;
          } finally {
            clearTimeout(timer);
          }
        } else {
          return await this.run(job);
        }
      },
      {
        connection: redisConnectionConfig.queueConnection(),
        concurrency: concurrency
      }
    );
    this.worker.on("error", (error) => {
      this.logger.debug("Error in worker processor", error);
    });
    closer.registerShutdownHook({
      resource: this,
      closingFunction: async (worker: BullWorker<any, any>) => {
        return await worker.shutdown();
      }
    });
  }

  abstract run(
    job: Job<JobRequest, JobResult>,
    signal?: AbortSignal
  ): Promise<JobResult>;

  public async shutdown(): Promise<void> {
    await this.worker.close(true).catch((error) => {
      this.logger.debug("Error while closing worker", error);
    });
  }
}
