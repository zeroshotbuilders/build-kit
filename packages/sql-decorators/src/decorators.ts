import { Injectable } from "@nestjs/common";
import {
  QueryTypes,
  Sequelize,
  Transaction,
  TransactionOptions
} from "sequelize";
import { createLogger, transports } from "winston";
import { Query } from "./query/query";
import { QueryParameterMapper } from "./query/query-parameter-mapper";
import { QueryRunner } from "./query/query-runner";
import { ResultMapper } from "./result/result-mapper";
import { StreamIterator } from "./stream-iterator";

const logger = createLogger({
  transports: [new transports.Console()]
});

/**
 * Customizable options for specifying DAOs
 * - queryDirectory (optional): the directory to look for queries in. If not specified, then each individual method
 *   must specify the query to execute. Should use `__dirname` to specify the directory so that it's relative to
 *   the DAO class.
 */
export type DaoOptions = {
  queryDirectory?: string;
};

/**
 * Decorator for a Data Access Object (DAO) class that contains SQL queries
 * @param options the class-namespaced options for the DAO
 * @constructor
 */
export function Dao(options?: DaoOptions): ClassDecorator {
  return function (target: any) {
    target.prototype.initialized = true;
    target.prototype.options = options;
  };
}

/**
 * The base class that handles dependency injection of the Sequelize instance
 */
@Injectable()
export class DaoBase {
  private options?: DaoOptions;
  private initialized?: boolean;
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }
}

/**
 * Decorator for any class that wants to initialize a SqlTransaction.
 * This will generally be used on "Repositories" that need to initiate multi-DAO transactions.
 * @constructor
 */
export function WithTransactionality(): ClassDecorator {
  return function (target: any) {
    target.prototype.initialized = true;
  };
}

/**
 * The base class for repositories that handles dependency injection of the Sequelize instance.
 * This will generally be used on "Repositories" that need to initiate multi-DAO transactions.
 */
@Injectable()
export class TransactionalityBase {
  private initialized?: boolean;
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }
}

/**
 * A type to specify class constructors.
 */
export type Clazz<T> = new (...args: any[]) => T;

/**
 * Customizable options for specifying SQL queries:
 * - <T> (required): the class of DTO that any queries returns
 * - queryType (required): the type of query to execute (e.g. SELECT, INSERT, UPDATE, etc...)
 * - clazz (optional): the class constructor to map the query results to. If not specified, then T is assumed to be a `type` or `void` (i.e. a plain object)
 * - returnList (optional): whether the query returns a list of results (needed for runtime mapping of empty lists)
 * - query (optional): If present, the query to execute.
 * - file (optional): If present, the file to read the query from. Should use `__dirname` to specify the directory so that it's relative to the DAO class.
 * If none of these are present, then the query is assumed to live in a file with the same name as the method
 * within the directory specified by DaoOptions.queryDirectory.
 */
export type QueryOptions<T> = {
  queryType: QueryTypes;
  clazz?: Clazz<T>;
  returnList?: boolean;
  query?: string;
  file?: string;
};

/**
 * Decorator for a class method that executes a SQL query parameterized by the provided arguments
 * @param options
 * @constructor
 */
export function SqlQuery<T>(options: QueryOptions<T>): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const parameterMapper = QueryParameterMapper.create(originalMethod);
    const resultMapper = ResultMapper.create(
      options.queryType,
      options.clazz,
      options.returnList
    );
    descriptor.value = async function (...args: any[]): Promise<T> {
      const parentClazzInstance = this as any;
      validateClazzInstance(parentClazzInstance);
      const query = Query.create(options, parentClazzInstance, propertyKey);
      const maybeTransaction: Transaction = args.find(
        (arg) => arg instanceof Transaction
      );
      const replacements = parameterMapper.makeParameterReplacements(args);
      const clazzInstanceSequelize = parentClazzInstance.sequelize as Sequelize;
      return QueryRunner.create(clazzInstanceSequelize, options.queryType)
        .runQuery(query, replacements, maybeTransaction)
        .then((queryResult) => resultMapper.mapResult(queryResult));
    };
  };
}

export type StreamSelectOptions<T> = {
  clazz?: Clazz<T>;
  batchSize?: number;
  query?: string;
  file?: string;
};

export function StreamSelect<T>(
  options: StreamSelectOptions<T>
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const parameterMapper = QueryParameterMapper.create(originalMethod);
    const queryType = QueryTypes.SELECT;
    const resultMapper = ResultMapper.create(queryType, options.clazz, true);
    descriptor.value = function (...args: any[]): StreamIterator<T> {
      try {
        const parentClazzInstance = this as any;
        const queryOpts: QueryOptions<T> = {
          ...options,
          queryType: queryType
        };
        validateClazzInstance(parentClazzInstance);
        const query = Query.create(queryOpts, parentClazzInstance, propertyKey);
        const replacements = parameterMapper.makeParameterReplacements(args);
        const clazzInstanceSequelize =
          parentClazzInstance.sequelize as Sequelize;
        const queryRunner = QueryRunner.create(
          clazzInstanceSequelize,
          queryType
        );
        return StreamIterator.create(
          query,
          queryRunner,
          resultMapper,
          replacements,
          options.batchSize
        );
      } catch (e) {
        logger.error(
          `Error executing query ${propertyKey.toString()} with args: ${args}`,
          e
        );
        throw e;
      }
    };
  };
}

/**
 * Decorator for a class method that contains calls to multiple SQL queries that should be grouped
 * together in a single Transactional commit.
 * @constructor
 */
export function SqlTransaction(options?: TransactionOptions): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const maybeTransaction: Transaction = args.find(
        (arg) => arg instanceof Transaction
      );
      if (maybeTransaction) {
        throw new Error("Cannot have nested `@SqlTransaction` calls");
      }
      const parentClazzInstance = this as any;
      validateClazzInstance(parentClazzInstance);
      const clazzInstanceSequelize = parentClazzInstance.sequelize as Sequelize;
      const transaction = await clazzInstanceSequelize.transaction(options);
      try {
        const result = await originalMethod.apply(this, [...args, transaction]);
        await transaction.commit();
        return result;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    };

    return descriptor;
  };
}

function validateClazzInstance(clazzInstance: any) {
  if (!clazzInstance.initialized) {
    throw new Error("DAO not initialized");
  }
  if (!clazzInstance.sequelize) {
    throw new Error("Sequelize not present on DAO");
  }
}
