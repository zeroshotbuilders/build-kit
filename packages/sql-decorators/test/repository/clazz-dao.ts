import {
  Dao,
  DaoBase,
  SqlQuery,
  StreamSelect,
  StringResult
} from "@zeroshotbuilders/sql-decorators";
import { List } from "immutable";
import { QueryTypes } from "sequelize";
import { StreamIterator } from "../../src/stream-iterator";

export const TEST_GETTER_VALUE = "testGetter";

export class TestClazzWithGetter {
  readonly someString: string;

  constructor(someString: string) {
    this.someString = someString;
  }

  get testGetter(): string {
    return TEST_GETTER_VALUE;
  }
}

export class TestClazz {
  readonly someString: string;
  readonly someNumber: number;

  constructor(someString: string, someNumber: number) {
    this.someString = someString;
    this.someNumber = someNumber;
  }

  testFunction(): string {
    return "test";
  }
}

export type GroupedQuery = {
  queryStrings: string[];
  queryNumbers: number[];
};

@Dao()
export class ClazzDao extends DaoBase {
  @SqlQuery<TestClazz>({
    queryType: QueryTypes.INSERT,
    query:
      "INSERT INTO clazzes (some_string, some_number) VALUES (:someString, :someNumber) RETURNING *"
  })
  insertTestClazz(lol: TestClazz): Promise<TestClazz> {
    return null;
  }

  @SqlQuery<TestClazz>({
    queryType: QueryTypes.UPDATE,
    clazz: TestClazz,
    query:
      "UPDATE clazzes set some_number = :newNumber WHERE some_string = :lookupString RETURNING *"
  })
  updateTestClazz(newNumber: number, lookupString: string): Promise<TestClazz> {
    return null;
  }

  @SqlQuery<TestClazz>({
    queryType: QueryTypes.UPDATE,
    clazz: TestClazz,
    returnList: true,
    query:
      "UPDATE clazzes set some_number = :newNumber WHERE some_string in (:lookupString1, :lookupString2) RETURNING *"
  })
  updateManyTestClazzes(
    newNumber: number,
    lookupString1: string,
    lookupString2: string
  ): Promise<TestClazz> {
    return null;
  }

  @SqlQuery<void>({
    queryType: QueryTypes.BULKUPDATE,
    query:
      "UPDATE clazzes set some_number = :newNumber WHERE some_string in (:lookupString1, :lookupString2)"
  })
  bulkUpdateManyTestClazzes(
    newNumber: number,
    lookupString1: string,
    lookupString2: string
  ): Promise<void> {
    return null;
  }

  @SqlQuery<TestClazz>({
    queryType: QueryTypes.SELECT,
    clazz: TestClazz,
    query: "SELECT * FROM clazzes where some_string = :lookupString"
  })
  getTestClazz(lookupString: string): Promise<TestClazz> {
    return null;
  }

  @SqlQuery<TestClazz>({
    queryType: QueryTypes.SELECT,
    clazz: TestClazz,
    returnList: true,
    query:
      "SELECT * FROM clazzes where some_string in (:queryString1, :queryString2) ORDER BY some_string ASC"
  })
  getMultipleTestClazzes(
    queryString1: string,
    queryString2: string
  ): Promise<List<TestClazz>> {
    return null;
  }

  @SqlQuery<TestClazz>({
    queryType: QueryTypes.SELECT,
    clazz: TestClazz,
    returnList: true,
    query:
      "SELECT * FROM clazzes where (:queryStrings) is null or some_string in (:queryStrings) ORDER BY some_string ASC"
  })
  getGroupedTestClazzesByString(
    queryStrings: string[] | undefined
  ): Promise<List<TestClazz>> {
    return null;
  }

  @SqlQuery<TestClazz>({
    queryType: QueryTypes.SELECT,
    clazz: TestClazz,
    returnList: true,
    query:
      "SELECT * FROM clazzes where some_number in (:queryNumbers) ORDER BY some_number ASC"
  })
  getGroupedTestClazzesByNumber(
    queryNumbers: number[]
  ): Promise<List<TestClazz>> {
    return null;
  }

  @SqlQuery<TestClazz>({
    queryType: QueryTypes.SELECT,
    clazz: TestClazz,
    returnList: true,
    query: `
        SELECT *
        FROM clazzes
        where ((
                   (:queryNumbers) is null or some_number in (:queryNumbers)
                   ) AND (
                   (:queryStrings) is null or some_string in (:queryStrings)
                   ))
        ORDER BY some_number ASC
    `
  })
  getGroupedTestClazzes(groupedQuery: GroupedQuery): Promise<List<TestClazz>> {
    return null;
  }

  @StreamSelect<TestClazz>({
    query: "SELECT * FROM clazzes",
    clazz: TestClazz,
    batchSize: 2
  })
  iterator(): StreamIterator<TestClazz> {
    return null;
  }

  @StreamSelect<TestClazz>({
    clazz: TestClazz,
    batchSize: 1,
    query:
      "SELECT * FROM clazzes where some_string in (:queryStrings) ORDER BY some_string ASC"
  })
  streamWithInClause(queryStrings: string[]): StreamIterator<TestClazz> {
    return null;
  }

  @SqlQuery<TestClazzWithGetter>({
    queryType: QueryTypes.INSERT,
    clazz: TestClazzWithGetter,
    query: `
        INSERT INTO clazzes_with_getter (some_string, test_getter)
        VALUES (:someString, :testGetter)
        RETURNING *
    `
  })
  insertTestGetterValue(
    testClazz: TestClazzWithGetter
  ): Promise<TestClazzWithGetter> {
    return null;
  }

  @SqlQuery<TestClazzWithGetter>({
    queryType: QueryTypes.SELECT,
    clazz: TestClazzWithGetter,
    query: `
        SELECT test_getter as result
        FROM clazzes_with_getter
        where some_string = :someString
    `
  })
  selectTestGetterValue(someString: string): Promise<StringResult> {
    return null;
  }
}
