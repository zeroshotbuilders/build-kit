import { Status } from "nice-grpc";

export function BullErrorHandler(error: Error): {
  errorStatus: Status;
  errorMessage: string;
} {
  const firstColonIndex = error.message.indexOf(":");

  const errorCode = error.message
    .slice(0, firstColonIndex)
    .trim() as keyof typeof Status;
  const errorMessage = error.message.slice(firstColonIndex + 1).trim();
  const errorStatus = Status[errorCode];

  return { errorStatus, errorMessage };
}
