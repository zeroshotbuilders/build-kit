import { ValidateIf, ValidationOptions } from "class-validator";
import { notEmpty } from "../internal/not-empty";

export const IsOptional = (
  validationOptions?: ValidationOptions
): PropertyDecorator =>
  ValidateIf((obj, value) => {
    return notEmpty(value);
  }, validationOptions);
