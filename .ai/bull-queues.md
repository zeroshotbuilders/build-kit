# BullMQ Crons & Async Workers

We use "bullmq" to run cron jobs and async workflows. Bull uses Redis under the hood.

## Prerequisites

The consuming service must have a configured redis instance.
For testing, boot a redis container:

```ts
const redisContainer = new RedisContainer();
await redisContainer.start();
```

Our utilities for interacting with Bull: `packages/commons/src/bull`.

## Queue + Worker Pattern

Every bull queue must have a `*-queue` and a `*-worker`.

### Queue

A queue wraps a BullMQ `Queue` and exposes an `addAndAwait()` method for enqueuing jobs:

```ts
@Injectable()
export class ExampleQueue {
  private queue: Queue;

  constructor(private redisConnectionConfig: RedisConnectionConfig) {
    this.queue = new Queue("example-queue", {
      connection: redisConnectionConfig.getConnection()
    });
  }

  async addAndAwait(data: ExampleRequest): Promise<ExampleResponse> {
    return await this.queue.add("example-job", data as any);
  }
}
```

### Worker

A worker processes jobs from the queue:

```ts
@Injectable()
export class ExampleWorker {
  private worker: Worker;

  constructor(private redisConnectionConfig: RedisConnectionConfig) {}

  start(): void {
    this.worker = new Worker("example-queue", async (job) => {
      // process job.data
    }, {
      connection: this.redisConnectionConfig.getConnection()
    });
  }
}
```

## Cron Jobs

The queue is injected and launched via `CronLauncher`:

```ts
this.cronLauncher = new CronLauncher([
  {
    queue: exampleCronQueue,
    pattern: config.cronPattern,
    interval: config.interval,
    jobId: EXAMPLE_CRON_JOB_ID
  }
]);
this.cronLauncher.launchCrons();
```

**All queues must have globally unique names in the codebase.**

## Async Processes

Bull is also used for general async processing of multi-stage workflows with retries.

Trigger an async task:

```ts
await this.exampleQueue.addAndAwait(request);
```

This adds an item to the queue, triggers the worker, and returns a response. There are default retry mechanisms on any
bull worker set up like this.
