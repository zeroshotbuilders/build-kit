import { ServerError, Status } from "nice-grpc";
import { Error as SequelizeError, UniqueConstraintError } from "sequelize";
import { Set } from "immutable";

export enum SequelizeErrors {
  UNIQUE_CONSTRAINT = "SequelizeUniqueConstraintError",
  FOREIGN_KEY_CONSTRAINT = "SequelizeForeignKeyConstraintError"
}

export async function withRecovery<T>(
  supplier: () => Promise<T>,
  errors: Set<SequelizeErrors | string>
): Promise<void> {
  try {
    await supplier();
  } catch (error) {
    if (error instanceof SequelizeError && errors.includes(error.name)) {
      return;
    }
    throw error;
  }
}

export async function withAlreadyExists<T>(
  supplier: () => Promise<T>
): Promise<T> {
  try {
    return await supplier();
  } catch (error) {
    if (
      error instanceof SequelizeError &&
      error.name == SequelizeErrors.UNIQUE_CONSTRAINT
    ) {
      const constraintError = error as UniqueConstraintError;
      throw new ServerError(
        Status.ALREADY_EXISTS,
        `Entity already exists: ${JSON.stringify(
          constraintError.fields,
          null,
          2
        )}`
      );
    }
    throw error;
  }
}

export function handleIdempotency<T>(
  baseError: SequelizeError,
  recoveryRunnable: () => Promise<T>,
  recoverableConstraintViolations: Set<string> = Set.of("idempotency_key")
): Promise<T> {
  if (baseError.name == SequelizeErrors.UNIQUE_CONSTRAINT) {
    const uniqueConstraintError = baseError as UniqueConstraintError;
    if (shouldRecover(uniqueConstraintError, recoverableConstraintViolations)) {
      try {
        return recoveryRunnable();
      } catch (error) {
        throw new Error(`Failed to recover idempotency violation: ${error}`);
      }
    }
    throw new ServerError(
      Status.ALREADY_EXISTS,
      `Item already exists: ${JSON.stringify(
        uniqueConstraintError.fields,
        null,
        2
      )}`
    );
  }
  throw baseError;
}

function shouldRecover(
  error: UniqueConstraintError,
  recoverableConstraintViolations: Set<string> = Set.of("idempotency_key")
): boolean {
  for (const constraintViolation of recoverableConstraintViolations) {
    if (constraintViolation in error.fields) {
      return true;
    }
  }
  return false;
}
