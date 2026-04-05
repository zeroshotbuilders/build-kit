import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions
} from "class-validator";

/**
 * Validates that at least one of the specified properties has a value.
 * This is useful for validating that at least one of a set of related fields is provided.
 *
 * The validation checks if any of the specified properties:
 * - Is an array with at least one element, OR
 * - Is a non-array value that is defined and not null
 *
 * This decorator can only be used at the class level.
 *
 * @param properties - Array of property names to check
 * @param validationOptions - Optional validation options from class-validator
 *
 * @example
 * // With array properties
 * @AtLeastOneOf(['clientIds', 'sessionChainIds'], {
 *   message: 'At least one of clientIds or sessionChainIds must be specified'
 * })
 * class GetSessionChainSummariesRequestDto {
 *   @IsOptional()
 *   readonly clientIds: string[] | undefined;
 *
 *   @IsOptional()
 *   readonly sessionChainIds: string[] | undefined;
 * }
 *
 * // With non-array properties
 * @AtLeastOneOf(['name', 'email'], {
 *   message: 'At least one of name or email must be specified'
 * })
 * class UserSearchDto {
 *   @IsOptional()
 *   readonly name: string | undefined;
 *
 *   @IsOptional()
 *   readonly email: string | undefined;
 * }
 */
export function AtLeastOneOf(
  properties: string[],
  validationOptions?: ValidationOptions
): ClassDecorator {
  return function (target: any) {
    registerDecorator({
      name: "atLeastOneOf",
      target: target,
      propertyName: "",
      constraints: [properties],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyNames] = args.constraints;
          const object = args.object as any;
          return relatedPropertyNames.some((propertyName: string | symbol) => {
            const value = object[propertyName];
            // Check if it's an array with at least one element
            if (Array.isArray(value)) {
              return value.length > 0;
            }
            // Check if it's a non-array value that is defined and not null
            return value !== undefined && value !== null && value !== "";
          });
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyNames] = args.constraints;
          return `At least one of the following properties must be specified: ${relatedPropertyNames.join(
            ", "
          )}`;
        }
      }
    });
  };
}
