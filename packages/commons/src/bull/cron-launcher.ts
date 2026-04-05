import { BullQueue } from "@zeroshotbuilders/commons";
import { Job, RepeatOptions } from "bullmq";
import { createLogger, transports } from "winston";

interface CronConfig {
  queue: BullQueue<any, any>;
  pattern?: string;
  interval?: number;
  jobId: string;
}

export class CronLauncher {
  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });

  constructor(private cronConfigs: CronConfig[]) {}

  public launchCrons(): void {
    this.cronConfigs.forEach((config) => this.launchCron(config));
  }

  private launchCron(config: CronConfig): void {
    const { queue, pattern, interval, jobId } = config;
    this.logger.info("Draining jobs");
    queue
      .getQueue()
      .drain(true)
      .then(() => {
        return queue
          .getQueue()
          .getRepeatableJobs()
          .then((jobs) => {
            jobs.map((job) => queue.getQueue().removeRepeatableByKey(job.key));
          });
      })
      .then(() =>
        queue
          .add(
            {},
            {
              jobId: jobId,
              repeat: this.repeatOptions(config)
            }
          )
          .then((job: Job<any, any, string>) => {
            this.logger.info(
              `Registered cron id:${job.id} with pattern:${pattern}`
            );
            queue
              .getQueue()
              .getRepeatableJobs()
              .then((jobs) => this.logger.info("Repeatable Jobs: ", { jobs }));
          })
      );
  }

  private repeatOptions(config: CronConfig): RepeatOptions {
    if (config.interval) {
      this.logger.info("Using interval: " + config.interval);
      return {
        every: config.interval,
        immediately: false
      };
    } else if (config.pattern) {
      this.logger.info("Using cron pattern: " + config.pattern);
      return {
        pattern: config.pattern,
        immediately: false
      };
    } else {
      throw new Error(
        'Either "interval" or "pattern" must be provided in CronConfig'
      );
    }
  }
}
