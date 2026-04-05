import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WinstonLogger } from "../logging/winston-logger";

const logger = new WinstonLogger();

export async function bootRest<ComponentT>(
  module: any,
  component: any,
  bootstrap: (comp: ComponentT, app: INestApplication) => Promise<number>,
  shutdown: (comp: ComponentT, app: INestApplication) => Promise<void>
) {
  const app = await NestFactory.create(module, {
    logger
  });
  const serviceComponent = app.get(component);
  logger.log("Booting REST service...");
  bootstrap(serviceComponent, app);
  process.on("SIGINT", async () => {
    logger.log("Received SIGINT signal. Shutting down gracefully...");
    await shutdown(serviceComponent, app);
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    logger.log("Received SIGTERM signal. Shutting down gracefully...");
    await shutdown(serviceComponent, app);
    process.exit(0);
  });
}
