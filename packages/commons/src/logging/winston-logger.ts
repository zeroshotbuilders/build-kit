import { LoggerService } from "@nestjs/common";
import { createLogger, Logger, transports } from "winston";

export class WinstonLogger implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger({
      transports: [new transports.Console()]
    });
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug?(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose?(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }
}
