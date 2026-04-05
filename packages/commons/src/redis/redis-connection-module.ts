import {
  DynamicModule,
  Module,
  Provider,
  ModuleMetadata
} from "@nestjs/common";
import {
  REDIS_CLIENT,
  REDIS_CONFIG_HOST,
  REDIS_CONFIG_PORT,
  REDIS_CONFIG_ROOT,
  RedisConnectionConfig,
  loadConfig,
  Closer,
  REDIS_CONFIG_POOL_SIZE
} from "@zeroshotbuilders/commons";
import { createClient, RedisClientType } from "redis";
import { createLogger, Logger, transports } from "winston";
import { RedisClientPool } from "./redis-client-pool";

const logger: Logger = createLogger({
  transports: [new transports.Console()]
});

@Module({})
export class RedisConnectionModule {
  public static REDIS_CONFIG_KEY = "redis";

  public static forApplicationRoot(applicationRoot: string): DynamicModule {
    const config = loadConfig<RedisConnectionConfig>(
      applicationRoot,
      RedisConnectionModule.REDIS_CONFIG_KEY
    );

    const resource: Provider[] = [
      {
        provide: REDIS_CONFIG_ROOT,
        useValue: applicationRoot
      },
      {
        provide: REDIS_CONFIG_PORT,
        useValue: config.port
      },
      {
        provide: REDIS_CONFIG_HOST,
        useValue: config.host
      },
      {
        provide: REDIS_CONFIG_POOL_SIZE,
        useValue: config.poolSize
      },
      RedisConnectionConfig,
      Closer,
      {
        provide: RedisClientPool,
        inject: [RedisConnectionConfig, Closer],
        useFactory: (
          connectionConfig: RedisConnectionConfig,
          closer: Closer
        ) => {
          return new RedisClientPool(connectionConfig, closer);
        }
      },
      {
        inject: [RedisConnectionConfig, Closer],
        provide: REDIS_CLIENT,
        useFactory: async (
          connectionConfig: RedisConnectionConfig,
          closer: Closer
        ) => {
          const client: RedisClientType = createClient({
            url: connectionConfig.url
          });
          await client.connect();
          client.on("error", (error) => {
            if (error.message === "Socket closed unexpectedly") {
              logger.debug(
                "Redis socket closed unexpectedly. This could be thrown from a shutdown hook.",
                error
              );
            } else {
              logger.error("Redis error.", error);
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
          return client;
        }
      }
    ];

    return {
      module: RedisConnectionModule,
      providers: resource,
      exports: resource as ModuleMetadata["exports"]
    };
  }
}
