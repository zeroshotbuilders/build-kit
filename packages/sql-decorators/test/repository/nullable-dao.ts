import { Dao, DaoBase, SqlQuery } from "@zeroshotbuilders/sql-decorators";
import { QueryTypes } from "sequelize";

export type NullableRecord = {
  someId: string;
  someNullableString: string | undefined;
  someNullableNumber: number | undefined;
};

@Dao()
export class NullableDao extends DaoBase {
  @SqlQuery<NullableRecord>({
    queryType: QueryTypes.INSERT,
    query:
      "INSERT INTO nullable_table (some_id, some_nullable_string, some_nullable_number) " +
      "VALUES (:someId, :someNullableString, :someNullableNumber) RETURNING *"
  })
  insertNullableRecord(
    nullableRecord: NullableRecord
  ): Promise<NullableRecord> {
    return null;
  }

  @SqlQuery<NullableRecord>({
    queryType: QueryTypes.INSERT,
    query: "SELECT * FROM nullable_table WHERE some_id = :id"
  })
  selectNullableRecord(id: string): Promise<NullableRecord> {
    return null;
  }
}
