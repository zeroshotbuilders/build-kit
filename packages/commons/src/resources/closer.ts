import { Injectable } from "@nestjs/common";
import { createLogger, transports } from "winston";

const CLOSER_FUNCTION_TIMEOUT = 10000;

type CloseableResource<T> = {
  resource: T;
  closingFunction: (r: T) => Promise<any>;
};

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMilliseconds: number
): Promise<T> {
  let timeout: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error("Timeout"));
    }, timeoutMilliseconds);
  });

  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeout)
  );
}

@Injectable()
export class Closer {
  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });
  private closeableResources: CloseableResource<any>[];

  public static create(...closeables: CloseableResource<any>[]): Closer {
    const closer = new Closer();
    closer.closeableResources = [...closeables];
    return closer;
  }

  constructor() {
    this.closeableResources = [];
  }

  public registerShutdownHook(closeable: CloseableResource<any>) {
    this.closeableResources.push(closeable);
  }

  public async close(): Promise<any> {
    for (const closeable of this.closeableResources) {
      const resourceName = closeable.resource.constructor.name;
      this.logger.info("Closing resource", {
        resourceName
      });
      await withTimeout(
        closeable.closingFunction(closeable.resource).catch((error) => {
          this.logger.warn("Exception while closing resource", error, {
            resourceName
          });
        }),
        CLOSER_FUNCTION_TIMEOUT
      ).catch((error) => {
        this.logger.warn("Timed out while closing resource", error, {
          resourceName
        });
      });
      this.logger.info("Successfully closed resource", {
        resourceName
      });
    }
  }
}
