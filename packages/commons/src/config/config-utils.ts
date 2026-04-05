import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { createLogger, transports } from "winston";

const logger = createLogger({
  transports: [new transports.Console()]
});

export function loadConfig<T>(
  mainDir: string,
  configKey = "",
  configFilePath = "assets/config.yaml"
): T {
  const packageRoot = path.dirname(mainDir);
  const configPath = path.join(packageRoot, configFilePath);
  if (!fs.existsSync(configPath)) {
    return {} as T;
  }
  const configFile = fs.readFileSync(configPath, "utf8");
  const config = yaml.load(configFile) as unknown as Record<string, unknown>;

  // Add function to read and parse environment variables
  function parseEnvVariables(): Record<string, unknown> {
    const parsedVariables: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("app_")) {
        logger.info(`Environment variable override of ${key} detected.`);
        const nestedKeys = key.replace("app_", "").split("___");
        let current: any = parsedVariables;

        nestedKeys.forEach((nestedKey, index) => {
          if (!current[nestedKey]) {
            if (index === nestedKeys.length - 1) {
              if (nestedKey.endsWith("_numeric")) {
                const trimmedNestedKey = nestedKey.replace("_numeric", "");
                current[trimmedNestedKey] = Number(value);
              } else if (nestedKey.endsWith("_boolean")) {
                const trimmedNestedKey = nestedKey.replace("_boolean", "");
                current[trimmedNestedKey] = value === "true";
              } else {
                current[nestedKey] = value;
              }
            } else {
              current[nestedKey] = {};
            }
          }

          current = current[nestedKey];
        });
      }
    }

    return parsedVariables;
  }

  // Add function to recursively merge two objects
  function deepMerge(
    obj1: Record<string, unknown>,
    obj2: Record<string, unknown>
  ): Record<string, unknown> {
    for (const [key, value] of Object.entries(obj2)) {
      if (typeof value === "object" && value !== null) {
        obj1[key] = deepMerge(
          (obj1[key] as Record<string, unknown>) || {},
          value as Record<string, unknown>
        );
      } else {
        obj1[key] = value;
      }
    }

    return obj1;
  }

  // Merge the parsed config and environment variables
  const mergedConfig = deepMerge(config, parseEnvVariables());

  if (!configKey) {
    return mergedConfig as T;
  }

  const keys = configKey.split(".");
  let subConfig: unknown = mergedConfig;
  for (const key of keys) {
    if (
      typeof subConfig === "object" &&
      subConfig !== null &&
      Object.prototype.hasOwnProperty.call(subConfig, key)
    ) {
      subConfig = (subConfig as Record<string, unknown>)[key];
    } else {
      throw new Error(`Config key '${configKey}' does not exist.`);
    }
  }

  logger.debug(
    `CONFIG { mainDir: ${mainDir}, configKey: ${configKey}, configFilePath: ${configFilePath}}: ${JSON.stringify(
      subConfig
    )}`
  );
  return subConfig as T;
}

export function runWithEnv<T>(
  runnable: () => T,
  envVars: Array<[string, string]>
): T {
  const oldEnv = { ...process.env }; // Backup the current environment variables
  // Set new environment variables
  envVars.forEach(([key, value]) => {
    process.env[key] = value;
  });
  try {
    return runnable();
  } finally {
    process.env = oldEnv; // Restore the original environment variables
  }
}
