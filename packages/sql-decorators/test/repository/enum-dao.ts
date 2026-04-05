import { Dao, DaoBase, SqlQuery, SqlTransaction } from "@zeroshotbuilders/sql-decorators";
import { List } from "immutable";
import { QueryTypes, Transaction } from "sequelize";

export enum SomeEnum {
  A = "A",
  B = "B"
}

export type EnumRecord = {
  someId: string;
  someEnum: SomeEnum;
};

@Dao()
export class EnumDao extends DaoBase {
  @SqlQuery<EnumRecord>({
    queryType: QueryTypes.INSERT,
    query:
      "INSERT INTO enum_table (some_id, some_enum) VALUES (:someId, :someEnum) RETURNING *"
  })
  insertEnumRecordTransactionally(
    enumRecord: EnumRecord,
    transaction?: Transaction
  ): Promise<EnumRecord> {
    return null;
  }

  @SqlQuery<EnumRecord>({
    queryType: QueryTypes.INSERT,
    query:
      "INSERT INTO enum_table (some_id, some_enum) VALUES (:someId, :someEnum) RETURNING *"
  })
  insertEnumByFields(
    someId: string,
    someEnum: SomeEnum,
    transaction?: Transaction
  ): Promise<EnumRecord> {
    return null;
  }

  @SqlQuery<EnumRecord>({
    queryType: QueryTypes.SELECT,
    query: "SELECT * FROM enum_table WHERE some_id = :id"
  })
  selectEnumRecord(id: string): Promise<EnumRecord> {
    return null;
  }

  @SqlTransaction()
  async insertManyTransactionally(
    enumRecords: List<EnumRecord>,
    transaction?: Transaction
  ): Promise<List<EnumRecord>> {
    return List(
      await Promise.all(
        enumRecords.map((record) =>
          this.insertEnumRecordTransactionally(record, transaction)
        )
      )
    );
  }
}
