import { Dao, SqlQuery, StreamSelect } from "@zeroshotbuilders/sql-decorators";
import { QueryTypes, Sequelize } from "sequelize";
import {
  BooleanResult,
  NumberResult,
  StringResult
} from "../../src/result/result-types";
import { StreamIterator } from "../../src/stream-iterator";

export type Thing = {
  someString: string;
  someNumber: number;
  someInt: number;
};

@Dao({
  queryDirectory: __dirname
})
export class TestDao {
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  @SqlQuery<void>({
    queryType: QueryTypes.INSERT
  })
  insertQuery(thing: Thing): Promise<void> {
    return null;
  }

  @SqlQuery<Thing>({
    queryType: QueryTypes.UPDATE,
    file: `${__dirname}/some-folder/updateQuery.sql`
  })
  updateQuery(newNumber: number, searchString: string): Promise<Thing> {
    return null;
  }

  @SqlQuery<Thing>({
    queryType: QueryTypes.UPDATE,
    returnList: true,
    query:
      "UPDATE test SET some_int = :newInt WHERE some_string in (:searchString1, :searchString2) returning *"
  })
  updateMultipleThingsQuery(
    newInt: number,
    searchString1: string,
    searchString2: string
  ): Promise<void> {
    return null;
  }

  @SqlQuery<void>({
    queryType: QueryTypes.BULKUPDATE,
    query:
      "UPDATE test SET some_int = :newInt WHERE some_string in (:searchString1, :searchString2)"
  })
  bulkUpdateMultipleThingsQuery(
    newInt: number,
    searchString1: string,
    searchString2: string
  ): Promise<void> {
    return null;
  }

  @SqlQuery<void>({
    queryType: QueryTypes.BULKDELETE,
    query:
      "DELETE FROM test WHERE some_string in (:searchString1, :searchString2)"
  })
  deleteMultipleThingsQuery(
    searchString1: string,
    searchString2: string
  ): Promise<void> {
    return null;
  }

  @SqlQuery<Thing>({
    queryType: QueryTypes.SELECT,
    query: "SELECT * FROM test where some_string = :someString"
  })
  selectQuery(someString: string): Promise<Thing> {
    return null;
  }

  @SqlQuery<void>({
    queryType: QueryTypes.UPSERT,
    query:
      "INSERT INTO test(some_string, some_number, some_int) VALUES (:someString, :someNumber, :someInt) ON CONFLICT (some_string) DO UPDATE SET some_number = :someNumber, some_int = :someInt;"
  })
  upsertQuery(thing: Thing): Promise<void> {
    return null;
  }

  @SqlQuery<Thing>({
    queryType: QueryTypes.UPDATE,
    query:
      "INSERT INTO test(some_string, some_number, some_int) VALUES (:someString, :someNumber, :someInt) ON CONFLICT (some_number) DO UPDATE SET some_int = :someInt RETURNING *;"
  })
  upsertQueryWithReturn(
    someString: string,
    someNumber: number,
    someInt: number
  ): Promise<Thing> {
    return null;
  }

  @SqlQuery<void>({
    queryType: QueryTypes.DELETE,
    query: "DELETE FROM test where some_string = :someString"
  })
  deleteQuery(someString: string): Promise<void> {
    return null;
  }

  @StreamSelect<Thing>({
    query:
      "SELECT * FROM test where some_int >= :minInt and some_int <= :maxInt ORDER BY some_int ASC",
    batchSize: 2
  })
  iterator(minInt: number, maxInt: number): StreamIterator<Thing> {
    return null;
  }

  @StreamSelect<Thing>({
    batchSize: 2
  })
  streamThings(minInt: number, maxInt: number): StreamIterator<Thing> {
    return null;
  }

  @SqlQuery<BooleanResult>({
    queryType: QueryTypes.SELECT,
    query: "SELECT true as result"
  })
  booleanResult(): Promise<BooleanResult> {
    return null;
  }

  @SqlQuery<StringResult>({
    queryType: QueryTypes.SELECT,
    query: "SELECT 'lol' as result"
  })
  stringResult(): Promise<StringResult> {
    return null;
  }

  @SqlQuery<NumberResult>({
    queryType: QueryTypes.SELECT,
    query: "SELECT 1 as result"
  })
  numberResult(): Promise<NumberResult> {
    return null;
  }
}
