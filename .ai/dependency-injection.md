# NestJS Dependency Injection

All dependencies in our object graph are managed via NestJS.
We add the `@Injectable()` tag to all classes that are created/managed via DI.

## Module Structure

We create a `Module` for each logical group of functionality:

```ts
import { Closer, ConfigModule, PostgresConnectionModule } from "@zeroshotbuilders/commons";
import { Module } from "@nestjs/common";
import { ExampleConfig } from "./config/example-config";
import { ExampleDao } from "./repository/example-dao";
import { ExampleRepository } from "./repository/example-repository";
import { ExampleServiceImpl } from "./service/example-service-impl";

@Module({
  providers: [
    ExampleServiceImpl,
    ExampleConfig,
    Closer,
    ExampleDao,
    ExampleRepository
  ],
  imports: [
    ConfigModule.forApplicationRoot(__dirname),
    PostgresConnectionModule.forApplicationRoot(__dirname)
  ]
})
export class ExampleModule {}
```

## Provider Registration

All classes that participate in DI must be:
1. Decorated with `@Injectable()`
2. Listed in the `providers` array of their module
3. Constructor-injected with their dependencies

```ts
@Injectable()
export class ExampleRepository {
  constructor(
    private readonly exampleDao: ExampleDao,
    private readonly config: ExampleConfig
  ) {}
}
```

## Cron Job Wiring

Services that need cron jobs wire them up via `CronLauncher`:

```ts
@Injectable()
export class ServiceComponent {
  constructor(
    private readonly cronQueue: ExampleCronQueue,
    private readonly config: ExampleConfig,
    private readonly closer: Closer
  ) {
    this.cronLauncher = new CronLauncher([
      {
        queue: cronQueue,
        pattern: config.cronPattern,
        interval: config.interval,
        jobId: EXAMPLE_CRON_JOB_ID
      }
    ]);
    this.cronLauncher.launchCrons();
  }
}
```
