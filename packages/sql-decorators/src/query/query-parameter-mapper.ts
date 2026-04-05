import { Transaction } from "sequelize";
import { createLogger, transports } from "winston";

export class QueryParameterMapper {
  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });
  private readonly func: () => void;
  private readonly parameterNames: string[];

  public static create(func: () => void): QueryParameterMapper {
    return new QueryParameterMapper(func);
  }

  private constructor(func: () => void) {
    this.func = func;
    this.parameterNames = this.getParameterNames(func);
  }

  public makeParameterReplacements(args: any[]): any {
    return this.replaceUndefinedWithNull(this.makeReplacementsInternal(args));
  }

  private makeReplacementsInternal(args: any[]): any {
    const { cleanArgs, params } = this.cleanArgsAndParameters(args);
    if (params.length === 0) {
      // No parameters, use empty replacements
      return {};
    } else if (
      params.length === 1 &&
      typeof cleanArgs[0] === "object" &&
      // Arrays evaluate as objects, so we need to check for array explicitly
      !Array.isArray(cleanArgs[0])
    ) {
      // Single complex type, pass it directly as the replacements
      const replacements: Record<string, any> = {};
      for (const key of Object.keys(cleanArgs[0])) {
        replacements[key] = cleanArgs[0][key];
      }
      // Include `get` fields
      const prototype = Object.getPrototypeOf(cleanArgs[0]);
      if (prototype) {
        const descriptors = Object.getOwnPropertyDescriptors(prototype);
        for (const [key, descriptor] of Object.entries(descriptors)) {
          if (typeof descriptor.get === "function") {
            replacements[key] = cleanArgs[0][key];
          }
        }
      }
      return replacements;
    } else if (params.length === cleanArgs.length) {
      // Named arguments
      const namedArgs: Record<string, any> = {};
      for (let i = 0; i < params.length; i++) {
        const paramName = params[i];
        namedArgs[paramName] = cleanArgs[i];
      }
      return namedArgs;
    } else {
      this.logger.debug(
        "Found mix of complex and simple types, taking first complex type as replacements"
      );
      return cleanArgs[0];
    }
  }

  /**
   * Remove the Transaction argument from args and the transaction parameter name from parameterNames
   * This is required so that we can pass transaction as a separate argument to sequelize query without
   * attempting to replace it in the query string
   */
  private cleanArgsAndParameters(args: any[]): {
    cleanArgs: any[];
    params: string[];
  } {
    // Create a copy of args and parameterNames
    const argsCopy = [...args];
    const parameterNamesCopy = [...this.parameterNames];

    // Find the index of the Transaction argument
    const transactionIndex = argsCopy.findIndex(
      (arg) => arg instanceof Transaction
    );
    if (transactionIndex !== -1) {
      // Remove the transaction parameter name from the copy
      parameterNamesCopy.splice(transactionIndex, 1);
      // Also remove the transaction argument from args copy
      argsCopy.splice(transactionIndex, 1);
    }
    return { cleanArgs: argsCopy, params: parameterNamesCopy };
  }

  private getParameterNames(func: () => void): string[] {
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
    const ARGUMENT_NAMES = /([^\s,]+)/g;
    const fnStr = func.toString().replace(STRIP_COMMENTS, "");
    const result = fnStr
      .slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")"))
      .match(ARGUMENT_NAMES);
    return result === null ? [] : result;
  }

  private replaceUndefinedWithNull(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      // obj is a primitive value or null
      return obj;
    }
    const copy: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      const value = obj[key];
      copy[key] =
        value === undefined ? null : this.replaceUndefinedWithNull(value);
    }
    return copy;
  }
}
