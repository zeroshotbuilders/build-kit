import { BatchingOptions, Query } from "./query";
import { QueryTypes, Sequelize, Transaction } from "sequelize";

export class QueryRunner {
  private sequelize: Sequelize;
  private queryType: QueryTypes;

  public static create(
    sequelize: Sequelize,
    queryType: QueryTypes
  ): QueryRunner {
    return new QueryRunner(sequelize, queryType);
  }

  private constructor(sequelize: Sequelize, queryType: QueryTypes) {
    this.sequelize = sequelize;
    this.queryType = queryType;
  }

  public async runQuery(
    query: Query,
    replacements: any,
    transaction?: Transaction,
    batchingOptions?: BatchingOptions
  ): Promise<any> {
    const transactionObject = transaction ? { transaction } : {};
    return this.sequelize.query(query.getQueryString(batchingOptions), {
      ...transactionObject,
      replacements: Object.assign({}, replacements),
      type: this.queryType
    });
  }
}
