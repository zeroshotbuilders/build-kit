import { Channel } from "@grpc/grpc-js";
import { createChannel as createGrpcChannel } from "nice-grpc/lib/client/channel";

export function toChannel(clientConfig: ClientConfig): Channel {
  return createGrpcChannel(`${clientConfig.address}:${clientConfig.port}`);
}

export class ClientConfig {
  readonly address!: string;
  readonly port!: number;
}
