import { List } from "immutable";
import { Query } from "./query/query";
import { QueryRunner } from "./query/query-runner";
import { ResultMapper } from "./result/result-mapper";
import { createLogger, Logger, transports } from "winston";

export class StreamIterator<T> {
  private readonly logger: Logger = createLogger({
    transports: [new transports.Console()]
  });

  public static create<T>(
    query: Query,
    queryRunner: QueryRunner,
    resultMapper: ResultMapper<T>,
    replacements: any,
    batchSize?: number
  ): StreamIterator<T> {
    return new StreamIterator(
      query,
      queryRunner,
      resultMapper,
      replacements,
      batchSize
    );
  }

  private iterator: AsyncIterator<T>;

  private constructor(
    private readonly query: Query,
    private readonly queryRunner: QueryRunner,
    private readonly resultMapper: ResultMapper<T>,
    private readonly replacements: any,
    private readonly batchSize: number = 1000
  ) {
    this.iterator = this.createAsyncGenerator()[Symbol.asyncIterator]();
  }

  private async *createAsyncGenerator(): AsyncGenerator<T> {
    let offset = 0;
    let batch: List<T> = List.of();
    let done = false;
    while (!done) {
      batch = await this.queryRunner
        .runQuery(this.query, this.replacements, undefined, {
          limit: this.batchSize,
          offset
        })
        .then(
          (queryResult) => this.resultMapper.mapResult(queryResult) as List<T>
        )
        .catch((e) => {
          this.logger.error(
            `Error generating batch of results query ${this.query.propertyKey.toString()}`,
            e
          );
          throw e;
        });
      offset += batch.size;
      done = batch.size < this.batchSize;
      for (const item of batch) {
        yield item;
      }
    }
  }

  public async next(): Promise<IteratorResult<T, any>> {
    return this.iterator.next();
  }

  public async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    for await (const item of this.createAsyncGenerator()) {
      yield item;
    }
  }
}
