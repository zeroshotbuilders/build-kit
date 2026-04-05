import {
  ApplicationConfig,
  loadConfig
} from "@zeroshotbuilders/commons";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PostgresConnectionConfig {
  public static POSTGRES_CONFIG_KEY = "postgres";

  readonly port: number;
  readonly host: string;
  readonly username: string;
  readonly password: string;
  readonly database: string;
  readonly logging: boolean;
  readonly standardConformingStrings: boolean;
  readonly ignoreClientMinMessages: boolean;
  readonly poolMax?: number;
  readonly poolAcquire?: number;
  readonly poolIdle?: number;

  static async create(
    applicationConfig: ApplicationConfig
  ): Promise<PostgresConnectionConfig> {
    const config = loadConfig<PostgresConnectionConfig>(
      applicationConfig.applicationRoot,
      PostgresConnectionConfig.POSTGRES_CONFIG_KEY
    );
    return {
      port: config.port,
      host: config.host,
      username: config.username,
      password: config.password,
      database: config.database,
      logging: config.logging || false,
      standardConformingStrings: config.standardConformingStrings ?? true,
      ignoreClientMinMessages: config.ignoreClientMinMessages ?? false,
      poolMax: config.poolMax,
      poolAcquire: config.poolAcquire,
      poolIdle: config.poolIdle
    };
  }
}
