import { QueryOptions } from "@zeroshotbuilders/sql-decorators";
import fs from "fs";

const queryCache: Map<string, string> = new Map();

export type BatchingOptions = {
  limit: number;
  offset: number;
};

export class Query {
  private constructor(
    private options: QueryOptions<any>,
    private parentClazzInstance: any,
    public propertyKey: string | symbol
  ) {}

  public static create<T>(
    options: QueryOptions<T>,
    parentClazzInstance: any,
    propertyKey: string | symbol
  ): Query {
    return new Query(options, parentClazzInstance, propertyKey);
  }

  public getQueryString(batchingOptions?: BatchingOptions): string {
    const queryDirectory =
      this.parentClazzInstance.options?.queryDirectory || "";
    const cachingKey =
      queryDirectory +
      this.parentClazzInstance.constructor.name +
      this.propertyKey.toString();
    const cachedQuery = queryCache.get(cachingKey);
    if (cachedQuery) {
      return this.applyBatchingOptions(cachedQuery, batchingOptions);
    } else {
      const query = this.makeQuery();
      queryCache.set(cachingKey, query);
      return this.applyBatchingOptions(query, batchingOptions);
    }
  }

  private applyBatchingOptions(
    query: string,
    batchingOptions?: BatchingOptions
  ): string {
    if (batchingOptions) {
      return `${query} LIMIT ${batchingOptions.limit} OFFSET ${batchingOptions.offset}`;
    } else {
      return query;
    }
  }

  private makeQuery(): string {
    let query: string | undefined;
    if (this.options.query) {
      query = this.options.query;
    } else if (this.options.file) {
      const filePath = `${this.options.file}`;
      query = fs.readFileSync(filePath, "utf-8");
    } else if (this.parentClazzInstance.options?.queryDirectory) {
      const queryDirectory = this.parentClazzInstance.options.queryDirectory;
      const filePath = `${queryDirectory}/${this.propertyKey.toString()}.sql`;
      query = fs.readFileSync(filePath, "utf-8");
    } else {
      throw new Error("No query or queryDirectory provided");
    }
    return query;
  }
}
