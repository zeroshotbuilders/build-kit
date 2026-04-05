import { Inject, Injectable } from "@nestjs/common";
import {
  REDIS_CONFIG_HOST,
  REDIS_CONFIG_PORT,
  REDIS_CONFIG_POOL_SIZE
} from "@zeroshotbuilders/commons";
import { ConnectionOptions } from "bullmq";

@Injectable()
export class RedisConnectionConfig {
  public readonly port: number;
  public readonly host: string;
  public readonly poolSize?: number;

  constructor(
    @Inject(REDIS_CONFIG_PORT) port: number,
    @Inject(REDIS_CONFIG_HOST) host: string,
    @Inject(REDIS_CONFIG_POOL_SIZE) poolSize?: number
  ) {
    this.port = port;
    this.host = host;
    this.poolSize = poolSize;
  }

  public get url(): string {
    /**
     * `redis[s]://[[username][:password]@][host][:port][/db-number]`
     * See [`redis`](https://www.iana.org/assignments/uri-schemes/prov/redis) and [`rediss`](https://www.iana.org/assignments/uri-schemes/prov/rediss) IANA registration for more details
     */
    return `redis://${this.host}:${this.port}`;
  }

  public queueConnection(): ConnectionOptions {
    return {
      host: this.host,
      port: this.port
    };
  }
}
