import { createLogger, transports } from "winston";

const logger = createLogger({
  transports: [new transports.Console()]
});

export const timeFunction = async <T>(
  func: () => Promise<T>,
  funcName = "Function"
) => {
  const start = process.hrtime();
  const result = await func();
  const diff = process.hrtime(start);
  const time = diff[0] * 1e3 + diff[1] / 1e6; // convert to milliseconds
  logger.info(`${funcName} execution time: ${time} milliseconds`);
  return result;
};
