import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { createLogger, transports } from "winston";

export enum OllamaMode {
  LOCAL = "LOCAL",
  CONTAINER = "CONTAINER"
}

export interface OllamaFixtureConfig {
  mode: OllamaMode;
  localHost?: string;
  localPort?: number;
}

/**
 * OllamaFixture provides a unified interface for running Ollama either locally
 * (for development on Mac with Apple Silicon) or via Docker container (for CI/testing).
 *
 * Local mode assumes Ollama is installed natively on the host machine.
 * Container mode uses the official ollama/ollama Docker image.
 *
 * For local mode on Mac, install Ollama via:
 *   brew install ollama
 *   ollama serve
 */
export class OllamaFixture {
  public static readonly PORT = 11434;
  public static readonly IMAGE = "ollama/ollama:latest";
  public static readonly DEFAULT_LOCAL_HOST = "localhost";

  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });

  private readonly mode: OllamaMode;
  private readonly localHost: string;
  private readonly localPort: number;

  private container: GenericContainer | undefined;
  private startedContainer: StartedTestContainer | undefined;

  constructor(config: OllamaFixtureConfig = { mode: OllamaMode.CONTAINER }) {
    this.mode = config.mode;
    this.localHost = config.localHost ?? OllamaFixture.DEFAULT_LOCAL_HOST;
    this.localPort = config.localPort ?? OllamaFixture.PORT;

    if (this.mode === OllamaMode.CONTAINER) {
      this.container = new GenericContainer(OllamaFixture.IMAGE)
        .withWaitStrategy(Wait.forLogMessage(new RegExp(".*Listening on.*"), 1))
        .withExposedPorts(OllamaFixture.PORT);
    }
  }

  public async start(): Promise<void> {
    if (this.mode === OllamaMode.CONTAINER) {
      if (!this.container) {
        throw new Error("Container not initialized");
      }
      this.logger.info("Starting Ollama container...");
      this.startedContainer = await this.container.start();
      this.logger.info(`Ollama container started at ${this.getBaseUrl()}`);
    } else {
      this.logger.info(`Using local Ollama instance at ${this.getBaseUrl()}`);
    }
  }

  public async stop(): Promise<void> {
    if (this.mode === OllamaMode.CONTAINER && this.startedContainer) {
      this.logger.info("Stopping Ollama container...");
      await this.startedContainer.stop();
      this.startedContainer = undefined;
    }
  }

  public getHost(): string {
    if (this.mode === OllamaMode.CONTAINER) {
      if (!this.startedContainer) {
        throw new Error("Container not started");
      }
      return this.startedContainer.getHost();
    }
    return this.localHost;
  }

  public getPort(): number {
    if (this.mode === OllamaMode.CONTAINER) {
      if (!this.startedContainer) {
        throw new Error("Container not started");
      }
      return this.startedContainer.getMappedPort(OllamaFixture.PORT);
    }
    return this.localPort;
  }

  public getBaseUrl(): string {
    return `http://${this.getHost()}:${this.getPort()}`;
  }

  public getMode(): OllamaMode {
    return this.mode;
  }

  public isLocal(): boolean {
    return this.mode === OllamaMode.LOCAL;
  }

  public isContainer(): boolean {
    return this.mode === OllamaMode.CONTAINER;
  }
}
