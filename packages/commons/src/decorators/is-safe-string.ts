import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions
} from "class-validator";

/**
 * Validates that a string does not contain potentially malicious links.
 * This is to protect against link injection in free text fields.
 * It guards against malicious links that would be rendered as a link in an email.
 * It does not block normal strings.
 */
export function IsSafeString(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return function (object: any, propertyName: string | symbol) {
    registerDecorator({
      name: "isSafeString",
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: any): boolean {
          if (typeof value !== "string") {
            return true; // Only validate strings
          }

          // Block obvious HTML tags and script/style blocks
          const htmlTagPattern = /<\/?\s*[a-z][\s\S]*?>/i; // matches <tag ...> or </tag>
          const scriptStylePattern =
            /<(script|style)\b[\s\S]*?>[\s\S]*?<\/\1>/i;

          // Block URLs and link-like content
          const urlPattern = /(http:\/\/|https:\/\/|www\.)/i;

          // Block Markdown links [text](url)
          const markdownLinkPattern = /\[[^\]]+\]\([^)]+\)/;

          // Block href attributes even without protocol (e.g., href='example.com')
          const hrefAttributePattern = /\bhref\s*=\s*(['"])?[^'"\s>]+\1?/i;

          // Combine checks
          if (htmlTagPattern.test(value)) return false;
          if (scriptStylePattern.test(value)) return false;
          if (urlPattern.test(value)) return false;
          if (markdownLinkPattern.test(value)) return false;
          return !hrefAttributePattern.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potentially malicious content`;
        }
      }
    });
  };
}
