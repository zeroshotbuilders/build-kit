import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions
} from "class-validator";

/**
 * Validates that a numeric property is greater than another numeric property in the same object.
 * This is useful for validating ranges, time periods, or any numeric relationships between properties.
 *
 * @param property - The name of the property to compare against
 * @param validationOptions - Optional validation options from class-validator
 *
 * @example
 * class TimeRange {
 *   @IsNumber()
 *   startTime: number;
 *
 *   @IsNumber()
 *   @IsBiggerThan('startTime', { message: 'End time must be after start time' })
 *   endTime: number;
 * }
 */
export function IsBiggerThan(
  property: string,
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isBiggerThan",
      target: object.constructor,
      propertyName: propertyName.toString(),
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];

          // Only validate if both values are numbers
          return (
            typeof value === "number" &&
            typeof relatedValue === "number" &&
            value > relatedValue
          );
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be greater than ${relatedPropertyName}`;
        }
      }
    });
  };
}
