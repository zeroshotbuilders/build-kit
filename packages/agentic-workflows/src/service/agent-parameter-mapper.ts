import { RepositorySession } from "../repository/session/repository-session";

export class AgentParameterMapper {
  private readonly parameterNames: string[];

  public static create(func: (...args: any[]) => any): AgentParameterMapper {
    return new AgentParameterMapper(func);
  }

  private constructor(func: (...args: any[]) => any) {
    this.parameterNames = this.extractParameterNames(func);
  }

  /**
   * Maps arguments to an object where keys are parameter names.
   * Special case: if a parameter is named 'context', it is excluded from the input object
   * and returned separately.
   */
  public mapArguments(args: any[]): {
    input: string;
    context?: Record<string, unknown>;
  } {
    const inputObj: Record<string, any> = {};
    let context: Record<string, unknown> | undefined;

    for (let i = 0; i < this.parameterNames.length; i++) {
      const name = this.parameterNames[i];
      const value = args[i];

      if (name === "context") {
        context = value;
      } else if (value instanceof RepositorySession) {
        // Skip session objects
      } else {
        inputObj[name] = value;
      }
    }

    // If there is only one input parameter and it's not 'context', and it's a string,
    // we could potentially just use it as the input string directly to remain backward compatible
    // or if the user wants it that way.
    // However, the issue description says "cast into a json string".
    // If we have multiple arguments, we definitely want JSON.
    // If we have one argument, JSON is also fine and more consistent.

    return {
      input: JSON.stringify(inputObj, null, 2),
      context
    };
  }

  public getParameterNames(): string[] {
    return this.parameterNames;
  }

  private extractParameterNames(func: (...args: any[]) => any): string[] {
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
    const ARGUMENT_NAMES = /([^\s,]+)/g;
    const fnStr = func.toString().replace(STRIP_COMMENTS, "");
    const result = fnStr
      .slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")"))
      .match(ARGUMENT_NAMES);

    if (result === null) {
      return [];
    }

    // Filter out potential artifacts like default values or destructured patterns if simple regex isn't enough
    // But for basic usage like `(arg1, arg2)` it works fine.
    return result;
  }
}
