import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions
} from "class-validator";

const validImageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

export function isImageUrl(
  hostNameContains: string | string[],
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return function (object: any, propertyName: string | symbol) {
    registerDecorator({
      name: "isImageUrl",
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== "string" || !value) return true;

          try {
            const url = new URL(value);
            const hostMatches =
              hostNameContains === ""
                ? true
                : Array.isArray(hostNameContains)
                ? hostNameContains.some((host) => url.hostname.includes(host))
                : url.hostname.includes(hostNameContains);

            const extensionMatches = validImageExtensions.some((ext) =>
              url.pathname.toLowerCase().endsWith(ext)
            );

            return hostMatches && extensionMatches;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const hostDesc =
            hostNameContains === ""
              ? "any host"
              : Array.isArray(hostNameContains)
              ? `host(s) containing ${hostNameContains.join(", ")}`
              : `a host containing "${hostNameContains}"`;

          return `${
            args.property
          } must be a valid image URL from ${hostDesc} ending with one of: ${validImageExtensions.join(
            ", "
          )}`;
        }
      }
    });
  };
}
