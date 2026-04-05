import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions
} from "class-validator";
import { DateTime, Duration } from "luxon";

/**
 * Validates that a timestamp (number) is at least a specified duration in the future.
 * This is useful for validating that dates are set in the future by a minimum amount of time.
 * The minimum timestamp is calculated at validation time, not at decorator definition time.
 *
 * @param offsetDuration - The minimum duration in the future the timestamp must be (Luxon Duration object).
 * @param validationOptions - Optional validation options from class-validator
 *
 * @example
 * class BasicReminder {
 *   @IsOptional()
 *   @FutureTimestamp(Duration.fromObject({ hours: 1 }), { message: 'Reminder must be at least one hour in the future' })
 *   reminderDate: number | undefined;
 * }
 */
export function FutureTimestamp(
  offsetDuration: Duration,
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "futureTimestamp",
      target: object.constructor,
      propertyName: propertyName.toString(),
      constraints: [offsetDuration],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          // Skip validation if value is undefined or null
          if (value === undefined || value === null) {
            return true;
          }

          // Only validate if value is a number
          if (typeof value !== "number") {
            return false;
          }

          const [duration] = args.constraints as Duration[];
          const minTimestamp = DateTime.now().plus(duration).toMillis();

          return value >= minTimestamp;
        },
        defaultMessage(args: ValidationArguments) {
          const [duration] = args.constraints as Duration[];
          const durationText = duration.toHuman();
          const minTimestamp = DateTime.now().plus(duration).toMillis();

          return `${args.property} [${new Date(
            args.value as number
          ).toISOString()}] must be set at least ${durationText} into the future [${new Date(
            minTimestamp
          ).toISOString()}]`;
        }
      }
    });
  };
}
