import {
  ApplicationConfig,
  POSTGRES_CONFIG_ROOT,
  PostgresConnectionConfig
} from "@zeroshotbuilders/commons";
import { DynamicModule, Module } from "@nestjs/common";
import { DataTypes, Sequelize } from "sequelize";

async function createSequelizeInstance(
  clientConfig: PostgresConnectionConfig
): Promise<Sequelize> {
  const sequelize = new Sequelize(
    clientConfig.database,
    clientConfig.username,
    clientConfig.password,
    {
      logging: clientConfig.logging,
      dialect: "postgres",
      host: clientConfig.host,
      port: clientConfig.port,
      standardConformingStrings: clientConfig.standardConformingStrings,
      pool: {
        max: clientConfig.poolMax ?? 5,
        acquire: clientConfig.poolAcquire ?? 60000,
        idle: clientConfig.poolIdle ?? 10000
      },
      dialectOptions: {
        bigNumberStrings: false,
        supportBigNumbers: true,
        ...(clientConfig.ignoreClientMinMessages && {
          clientMinMessages: "ignore"
        })
      },
      hooks: {
        afterConnect: () => {
          const types = {
            DECIMAL: {
              ...DataTypes.DECIMAL,
              parse: parseFloat
            },
            BIGINT: {
              ...DataTypes.BIGINT,
              parse: parseInt
            }
          };
          sequelize.connectionManager.refreshTypeParser(types);
        }
      }
    }
  );
  await sequelize.authenticate();
  return sequelize;
}

@Module({})
export class PostgresConnectionModule {
  public static forApplicationRoot(applicationRoot: string): DynamicModule {
    return {
      module: PostgresConnectionModule,
      providers: [
        {
          provide: POSTGRES_CONFIG_ROOT,
          useValue: applicationRoot
        },
        {
          provide: PostgresConnectionConfig,
          useFactory: async (
            applicationConfig: ApplicationConfig
          ) => {
            return await PostgresConnectionConfig.create(
              applicationConfig
            );
          },
          inject: [
            ApplicationConfig,
            POSTGRES_CONFIG_ROOT
          ]
        },
        {
          provide: Sequelize,
          inject: [PostgresConnectionConfig],
          useFactory: async (clientConfig: PostgresConnectionConfig) => {
            return createSequelizeInstance(clientConfig);
          }
        }
      ],
      exports: [
        POSTGRES_CONFIG_ROOT,
        Sequelize,
        PostgresConnectionConfig
      ]
    };
  }
}
