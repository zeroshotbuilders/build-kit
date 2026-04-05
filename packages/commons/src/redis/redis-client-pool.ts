import { RedisClientType, createClient } from "redis";
import { Closer, RedisConnectionConfig } from "@zeroshotbuilders/commons";
import { createLogger, Logger, transports } from "winston";

export class RedisClientPool {
  private readonly logger: Logger = createLogger({
    transports: [new transports.Console()]
  });
  private clientPool: RedisClientType[] = [];

  constructor(connectionConfig: RedisConnectionConfig, closer: Closer) {
    const poolSize = connectionConfig.poolSize || 10;
    for (let i = 0; i < poolSize; i++) {
      const client: RedisClientType = createClient({
        url: connectionConfig.url
      });
      client.on("error", (error) => {
        if (error.message === "Socket closed unexpectedly") {
          this.logger.debug(
            "Redis socket closed unexpectedly. This could be thrown from a shutdown hook.",
            error
          );
        } else {
          this.logger.error("Redis error.", error);
        }
      });
      closer.registerShutdownHook({
        resource: client,
        closingFunction: async (client: RedisClientType) => {
          if (client && client.isOpen) {
            await client.disconnect();
          }
        }
      });
      this.clientPool.push(client);
    }
  }

  public async acquire(): Promise<RedisClientType> {
    while (this.clientPool.length === 0) {
      this.logger.warn("No redis clients available");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const client = this.clientPool.pop();

    if (client) {
      if (!client.isOpen) {
        await client.connect();
      }
      return client;
    } else {
      throw new Error("Failed to acquire a Redis client.");
    }
  }

  public release(client: RedisClientType): void {
    this.clientPool.push(client);
  }

  public async withConnection<T>(
    func: (client: RedisClientType) => Promise<T> | T
  ): Promise<T> {
    const client = await this.acquire();
    try {
      return await func(client);
    } finally {
      this.release(client);
    }
  }
}
