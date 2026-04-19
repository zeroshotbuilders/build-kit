import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { createLogger, transports } from "winston";

export class DoclingContainer {
  public static readonly PORT = 5001;
  public static readonly IMAGE = "quay.io/docling-project/docling-serve:latest";

  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });

  private readonly container: GenericContainer;
  private startedContainer: StartedTestContainer;

  constructor() {
    this.container = new GenericContainer(DoclingContainer.IMAGE)
      .withWaitStrategy(
        Wait.forLogMessage(/Uvicorn running on/, 1)
      )
      .withExposedPorts(DoclingContainer.PORT);
  }

  public async start() {
    this.logger.info("Starting Docling container...");
    this.startedContainer = await this.container.start();
    this.logger.info(
      `Docling container started on port ${this.getMappedPort()}`
    );
  }

  public async stop() {
    if (this.startedContainer) {
      await this.startedContainer.stop();
    }
  }

  public getBaseUrl(): string {
    return `http://${this.startedContainer.getHost()}:${this.getMappedPort()}`;
  }

  public getMappedPort(): number {
    return this.startedContainer.getMappedPort(DoclingContainer.PORT);
  }

  public getHost(): string {
    return this.startedContainer.getHost();
  }
}
