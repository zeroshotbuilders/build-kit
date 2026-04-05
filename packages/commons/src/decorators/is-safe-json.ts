import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions
} from "class-validator";

/**
 * Regular expression to detect potentially malicious links.
 * This is the same pattern used in your IsSafeString validator.
 */
const maliciousLinkPattern =
  /(<a\s+|<\/a>|href=|src=|http:\/\/|https:\/\/|www\.|[^<]\[[^\]]+\]\([^)]+\))/i;

function isUnsafeString(value: string): boolean {
  return maliciousLinkPattern.test(value);
}

/**
 * Recursively traverses an object or array to find strings with malicious content.
 * @param obj The object to traverse.
 * @returns An array of paths to unsafe strings.
 */
function findUnsafeStringPaths(obj: any): string[] {
  const unsafePaths: string[] = [];

  function traverse(current: any, path: string) {
    if (!current) {
      return;
    }

    if (typeof current === "string") {
      if (isUnsafeString(current)) {
        unsafePaths.push(path || "root");
      }
      return;
    }

    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        traverse(current[i], `${path}[${i}]`);
      }
      return;
    }

    if (typeof current === "object") {
      for (const key of Object.keys(current)) {
        traverse(current[key], path ? `${path}.${key}` : key);
      }
    }
  }

  traverse(obj, "");
  return unsafePaths;
}

/**
 * Validates that a JSON object does not contain strings with potentially malicious links.
 * This is to protect against link injection.
 */
export function IsSafeJson(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return function (object: any, propertyName: string | symbol) {
    registerDecorator({
      name: "isSafeJson",
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "object" || value === null) {
            return true; // Only validate objects (and arrays).
          }

          const unsafePaths = findUnsafeStringPaths(value);

          if (unsafePaths.length > 0) {
            // Store details for a more informative error message.
            (args.object as any)[`${args.property}_unsafeDetails`] =
              unsafePaths.join(", ");
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const unsafeDetails = (args.object as any)[
            `${args.property}_unsafeDetails`
          ];
          return `${args.property} contains potentially malicious content at the following paths: ${unsafeDetails}`;
        }
      }
    });
  };
}
