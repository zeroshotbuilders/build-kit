import { Clazz } from "@zeroshotbuilders/sql-decorators";
import { List } from "immutable";
import { P, match } from "ts-pattern";
import { QueryTypes } from "sequelize";
import { plainToInstance } from "class-transformer";

export class ResultMapper<T> {
  private constructor(
    private queryType: QueryTypes,
    private clazz: Clazz<T>,
    private returnList: boolean
  ) {}

  public static create<T>(
    queryType: QueryTypes,
    clazz: Clazz<T>,
    returnList: boolean
  ) {
    return new ResultMapper(queryType, clazz, returnList);
  }

  public mapResult(queryResult: any[]): T {
    return match(this.queryType)
      .with(QueryTypes.SELECT, () => this.mapSelect(queryResult))
      .with(QueryTypes.INSERT, () => this.mapInsertOrUpdate(queryResult))
      .with(QueryTypes.UPDATE, () => this.mapInsertOrUpdate(queryResult))
      .with(QueryTypes.UPSERT, () => this.mapUpsert())
      .with(QueryTypes.DELETE, () => this.mapDelete())
      .with(QueryTypes.BULKUPDATE, () => this.mapUndefinedResponse())
      .with(QueryTypes.BULKDELETE, () => this.mapUndefinedResponse())
      .with(QueryTypes.RAW, () => this.mapUndefinedResponse())
      .with(P._, () => {
        throw new Error(`Unsupported query type: ${this.queryType}`);
      })
      .exhaustive();
  }

  private mapSelect(queryResult: any[]): T {
    if (this.returnList) {
      return List(
        queryResult.map((record) => generateInstance(this.clazz, record))
      ) as T;
    } else if (queryResult.length == 0) {
      return undefined as T;
    } else if (queryResult.length == 1) {
      return generateInstance(
        this.clazz,
        queryResult[0] as Record<string, any>
      );
    } else if (queryResult.length > 1) {
      throw new Error(
        "Multiple records returned. If you want to return a list, set `returnList` to true"
      );
    } else {
      throw new Error("Invalid query result");
    }
  }

  private mapInsertOrUpdate(queryResult: any[]): T {
    const result = queryResult[0] as unknown[];
    if (this.returnList) {
      return List(
        result.map((record) => generateInstance(this.clazz, record))
      ) as T;
    } else if (result.length == 0) {
      return undefined as T;
    } else if (result.length == 1) {
      return generateInstance(this.clazz, result[0] as Record<string, any>);
    } else {
      throw new Error(
        "Multiple records returned. If you want to return a list, set `returnList` to true"
      );
    }
  }

  private mapUpsert(): T {
    return undefined as T;
  }

  private mapDelete(): T {
    return undefined as T;
  }

  private mapUndefinedResponse(): T {
    return undefined as T;
  }
}

function generateInstance<T>(clazz: Clazz<T>, record: Record<string, any>): T {
  const camelCaseInstance = snakeToCamel(record);
  const nullReplacedInstance = replaceNullWithUndefined(camelCaseInstance);
  if (clazz) {
    // If a constructor has been passed, then we use it to instantiate the class
    return plainToInstance(clazz, nullReplacedInstance);
  } else {
    // Otherwise, we just return the plain object
    return nullReplacedInstance as T;
  }
}

function snakeToCamel(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamel(item));
  }

  const camelObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z0-9])/g, (_, match) =>
        match.toUpperCase()
      );
      camelObj[camelKey] = snakeToCamel(obj[key]);
    }
  }
  return camelObj;
}

function replaceNullWithUndefined(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceNullWithUndefined(item));
  }

  const copy: any = {};
  for (const key in obj) {
    const value = obj[key];
    copy[key] = value === null ? undefined : replaceNullWithUndefined(value);
  }
  return copy;
}
