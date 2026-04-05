import { ClientError, ServerError, Status } from "nice-grpc";
import { List } from "immutable";
import { UnrecoverableError } from "bullmq";

export const UnrecoverableGrpcExceptions = List.of(
  Status.NOT_FOUND,
  Status.FAILED_PRECONDITION,
  Status.INVALID_ARGUMENT,
  Status.PERMISSION_DENIED
);

export const withCheckedExceptions = async <T>(
  runnable: () => Promise<T>
): Promise<T> => {
  try {
    return await runnable();
  } catch (error: any) {
    // Handle grpc exceptions
    if (
      (error instanceof ServerError || error instanceof ClientError) &&
      UnrecoverableGrpcExceptions.contains(error.code)
    ) {
      throw new UnrecoverableError(error.message);
    }
    // Otherwise job will be retried
    throw error;
  }
};
