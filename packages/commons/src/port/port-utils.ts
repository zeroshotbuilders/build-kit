import * as net from "net";
import { Pattern, match } from "ts-pattern";
import { Range, Seq } from "immutable";

export interface PortStatus {
  port: number;
  isOpen: boolean;
}

export class PortConfig {
  readonly minPort!: number;
  readonly maxPort!: number;
}

export async function findOpenPort(config: PortConfig): Promise<number> {
  if (config.minPort > config.maxPort) {
    throw new Error("minPort must be less than or equal to maxPort");
  }
  const openPort: number | undefined = await Seq(
    Range(config.minPort, config.maxPort + 1)
  ).reduce(
    async (prevPortPromise: Promise<number | undefined>, port: number) => {
      const prevPort: number | undefined = await prevPortPromise;
      if (prevPort !== undefined) {
        return prevPort;
      }
      const result: PortStatus = await checkPort(port);
      return result.isOpen ? result.port : undefined;
    },
    Promise.resolve(undefined)
  );
  return match(openPort)
    .with(Pattern.not(undefined), (port) => port)
    .otherwise(() => {
      throw new Error("No open port found in the specified range");
    });
}

export function checkPort(port: number): Promise<PortStatus> {
  return new Promise((resolve) => {
    const server: net.Server = net.createServer();

    server.unref();
    server.on("error", () => resolve({ port, isOpen: false }));

    server.listen(port, "0.0.0.0", () => {
      server.close(() => resolve({ port, isOpen: true }));
    });
  });
}
