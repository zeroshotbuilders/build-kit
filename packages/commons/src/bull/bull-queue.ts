import { Injectable } from "@nestjs/common";
import { Job, JobsOptions, Queue, QueueEvents } from "bullmq";
import {
  BullErrorHandler,
  loadConfig,
  RedisConnectionConfig
} from "@zeroshotbuilders/commons";
import { Closer } from "@zeroshotbuilders/commons";
import { ServerError } from "nice-grpc";
import { createLogger, Logger, transports } from "winston";
import { kebabToCamel } from "../internal/string-utils";
import { DefaultJobOptions } from "bullmq";
import { v4 as uuid } from "uuid";

const DEFAULT_REMOVE_ON_COMPLETE_SECONDS = 60 * 60 * 24 * 30; // 30 days

@Injectable()
export abstract class BullQueue<JobRequest, JobResult> {
  protected readonly logger: Logger = createLogger({
    transports: [new transports.Console()]
  });
  protected readonly queue: Queue<JobRequest, JobResult>;
  protected readonly queueEvents: QueueEvents;

  constructor(
    applicationRoot: string,
    queueName: string,
    redisConnectionConfig: RedisConnectionConfig,
    closer: Closer
  ) {
    const queueConfig = this.resolveQueueConfig(applicationRoot, queueName);
    this.logger.info("Registering bull queue", {
      queueName,
      config: queueConfig
    });
    this.queue = new Queue<JobRequest, JobResult>(queueName, {
      connection: redisConnectionConfig.queueConnection(),
      defaultJobOptions: queueConfig
    });
    this.queue.on("error", (error) => {
      this.logger.error("Error while processing queue", error);
    });
    this.queueEvents = new QueueEvents(queueName, {
      connection: redisConnectionConfig.queueConnection()
    });
    this.queueEvents.on("error", (error) => {
      this.logger.error("Error while processing queueEvents", error);
    });
    closer.registerShutdownHook({
      resource: this,
      closingFunction: async (queue: BullQueue<any, any>) => {
        return await queue.shutdown();
      }
    });
  }

  public async add(
    jobRequest: JobRequest,
    options?: JobsOptions
  ): Promise<Job<JobRequest, JobResult>> {
    const jobOptions = {
      jobId: uuid(),
      removeOnComplete: {
        age: DEFAULT_REMOVE_ON_COMPLETE_SECONDS
      },
      ...options
    };
    return this.queue.add(this.queue.name as any, jobRequest as any, jobOptions) as any;
  }

  public async addAndAwait(
    jobRequest: JobRequest,
    options?: JobsOptions
  ): Promise<JobResult> {
    return this.add(jobRequest, options)
      .then(async (job) => job.waitUntilFinished(this.getQueueEvents()))
      .catch((error) => {
        const { errorStatus, errorMessage } = BullErrorHandler(error);
        throw new ServerError(errorStatus, errorMessage);
      });
  }

  public getQueue(): Queue {
    return this.queue;
  }

  public getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }

  public async shutdown(): Promise<any> {
    await this.queue.close().catch((error) => {
      this.logger.debug("Error while closing queue", error);
    });
    await this.queueEvents.close().catch((error) => {
      this.logger.debug("Error while closing queueEvents", error);
    });
  }

  private resolveQueueConfig(
    applicationRoot: string,
    queueName: string
  ): DefaultJobOptions {
    try {
      return (
        loadConfig<DefaultJobOptions>(
          applicationRoot,
          kebabToCamel(queueName)
        ) ?? {}
      );
    } catch (_) {
      this.logger.warn(
        `Could not load config for ${queueName}. Defaults will be used`
      );
      return {};
    }
  }
}
