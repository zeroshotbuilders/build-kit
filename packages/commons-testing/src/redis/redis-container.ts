import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { RedisConnectionConfig } from "@zeroshotbuilders/commons";
import { createLogger, transports } from "winston";

export class RedisContainer {
  public static readonly PORT = 6379;
  public static readonly IMAGE = "redis:8.4.2";

  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });

  private readonly container: GenericContainer;
  private startedContainer: StartedTestContainer;

  constructor() {
    this.container = new GenericContainer(RedisContainer.IMAGE)
      .withWaitStrategy(
        Wait.forLogMessage(new RegExp(".*Ready to accept connections.*"), 1)
      )
      .withExposedPorts(RedisContainer.PORT);
  }

  public async start() {
    this.startedContainer = await this.container.start();
  }

  public async stop() {
    if (this.startedContainer) {
      await this.startedContainer.stop();
    }
  }

  public getConnectionConfig(): RedisConnectionConfig {
    return new RedisConnectionConfig(
      this.startedContainer.getMappedPort(RedisContainer.PORT),
      this.startedContainer.getHost()
    );
  }
}
