import { Transform } from "class-transformer";
import { notEmpty } from "../internal/not-empty";

export const Default = (defaultValue: any): PropertyDecorator =>
  Transform(({ value }: any) => (notEmpty(value) ? value : defaultValue));

export const DefaultProvider = (
  defaultProvider: () => any
): PropertyDecorator =>
  Transform(({ value }: any) => (notEmpty(value) ? value : defaultProvider()));
