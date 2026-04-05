import { PostgresConnectionConfig } from "@zeroshotbuilders/commons";
import * as fs from "fs";
import { List } from "immutable";
import * as path from "path";
import { DataTypes, QueryTypes, Sequelize } from "sequelize";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import * as util from "util";
import { createLogger, transports } from "winston";

const readDir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

function extractNumberFromPrefix(s: string): number {
  const numStr = s.slice(1).split("__")[0];
  return parseInt(numStr, 10);
}

function sortByPrefix(strings: string[]): string[] {
  return strings.sort((a, b) => {
    return extractNumberFromPrefix(a) - extractNumberFromPrefix(b);
  });
}

export class PostgresContainer {
  public static readonly USER = "postgres";
  public static readonly PASSWORD = "password";
  public static readonly PORT = 5432;
  public static readonly IMAGE = "postgres:17-alpine";

  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });

  private readonly database: string;
  private readonly container: GenericContainer;
  private startedContainer: StartedTestContainer;
  private sequelize: Sequelize;

  constructor(database = "postgres") {
    this.database = database;
    this.container = new GenericContainer(PostgresContainer.IMAGE)
      .withExposedPorts(PostgresContainer.PORT)
      .withWaitStrategy(
        Wait.forLogMessage(
          new RegExp(".*database system is ready to accept connections.*"),
          2
        )
      )
      .withEnvironment({
        POSTGRES_USER: PostgresContainer.USER,
        POSTGRES_PASSWORD: PostgresContainer.PASSWORD,
        POSTGRES_DATABASE: database
      });
  }

  public async start() {
    this.startedContainer = await this.container.start();
  }

  public async stop() {
    if (this.startedContainer) {
      await this.startedContainer.stop();
    }
    if (this.sequelize) {
      await this.sequelize.close();
    }
  }

  public getConnectionConfig(
    standardConformingStrings = true,
    ignoreClientMinMessages = false
  ): PostgresConnectionConfig {
    return {
      host: this.startedContainer.getHost(),
      port: this.startedContainer.getMappedPort(PostgresContainer.PORT),
      username: PostgresContainer.USER,
      password: PostgresContainer.PASSWORD,
      database: this.database,
      logging: false,
      standardConformingStrings: standardConformingStrings,
      ignoreClientMinMessages: ignoreClientMinMessages
    };
  }

  public getSequelizeClient(): Sequelize {
    if (!this.sequelize) {
      this.sequelize = this.makeSequelizeClient();
    }
    return this.sequelize;
  }

  public async applyMigrations(migrationsDir: string): Promise<void> {
    const files: string[] = await readDir(migrationsDir);
    const filesSorted = List(sortByPrefix(files));
    for (const file of filesSorted) {
      const filePath = path.join(migrationsDir, file);
      // Ensure that the file is not a directory
      if (fs.statSync(filePath).isFile()) {
        const migrationsQuery = await readFile(filePath, "utf-8");
        await this.getSequelizeClient().query(migrationsQuery, {
          type: QueryTypes.RAW
        });
      }
    }
  }

  private makeSequelizeClient(): Sequelize {
    return new Sequelize(
      this.database,
      PostgresContainer.USER,
      PostgresContainer.PASSWORD,
      {
        logging: false,
        dialect: "postgres",
        host: this.startedContainer.getHost(),
        port: this.startedContainer.getMappedPort(PostgresContainer.PORT),
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
            this.sequelize.connectionManager.refreshTypeParser(types);
          }
        }
      }
    );
  }
}
