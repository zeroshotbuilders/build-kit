import "reflect-metadata";
import {
  BeforeAllTimeout,
  PostgresContainer,
  unreachableErr
} from "@zeroshotbuilders/commons-testing";
import { List, Set } from "immutable";
import * as randomstring from "randomstring";
import { QueryTypes, Sequelize } from "sequelize";
import { ArrayDao } from "./repository/array-dao";
import { BrokenDao } from "./repository/broken-dao";
import {
  ClazzDao,
  TEST_GETTER_VALUE,
  TestClazz,
  TestClazzWithGetter
} from "./repository/clazz-dao";
import { EnumDao, EnumRecord, SomeEnum } from "./repository/enum-dao";
import { LolDao } from "./repository/lol-dao";
import { Nested, NestedDao, SubType } from "./repository/nested-dao";
import { NullableDao, NullableRecord } from "./repository/nullable-dao";
import { TestDao, Thing } from "./repository/test-dao";
import { UnconventionalDao } from "./repository/unconventional-dao";
import { TestRepository } from "./transaction-repository/test-repository";

describe("DAO utils", () => {
  let postgres: PostgresContainer;
  let sequelize: Sequelize;

  beforeAll(async () => {
    postgres = new PostgresContainer();
    await postgres.start();
    sequelize = postgres.getSequelizeClient();

    await sequelize.query(
      "CREATE TABLE test (some_string varchar(255) PRIMARY KEY, some_number NUMERIC NOT NULL UNIQUE, some_int BIGINT NOT NULL);",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE lol (some_string varchar(255) PRIMARY KEY);",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE clazzes (some_string varchar(255) PRIMARY KEY, some_number NUMERIC NOT NULL);",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE broken (some_string varchar(255) PRIMARY KEY);",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE nullable_table (some_id varchar(255) PRIMARY KEY," +
        "some_nullable_string varchar(255), some_nullable_number NUMERIC);",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE enum_table (some_id varchar(255) PRIMARY KEY, some_enum varchar(255));",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE nested (id varchar(255) PRIMARY KEY);",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE sub_type (name varchar(255) PRIMARY KEY);",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE unconventional (some_1_name_2_with_3_numbers_4_intertwined varchar(255) PRIMARY KEY, some_name_ending_in_a_number_1 varchar(255));",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE array_table (some_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), some_array_1 VARCHAR(255)[], some_array_2 VARCHAR(255)[], some_jsonb_array JSONB[]);",
      { type: QueryTypes.RAW }
    );
    await sequelize.query(
      "CREATE TABLE clazzes_with_getter (some_string varchar(255) PRIMARY KEY, test_getter VARCHAR);",
      { type: QueryTypes.RAW }
    );
  }, BeforeAllTimeout);

  afterAll(async () => {
    await postgres.stop();
  });

  it("should work end-to-end in the happy path", async () => {
    const testDao = new TestDao(sequelize);
    const myString = "abc123";
    const myNumber = 1.01;
    const myInt = 1;
    const thing: Thing = { someString: myString, someNumber: myNumber, someInt: myInt };
    const insertResult = await testDao.insertQuery(thing);
    expect(insertResult).toBeUndefined();
    const selectResult = await testDao.selectQuery(myString);
    expect(selectResult).toEqual(thing);
    const myNewNumber = 2;
    const updateResult = await testDao.updateQuery(myNewNumber, myString);
    const newThing: Thing = { someString: myString, someNumber: myNewNumber, someInt: myInt };
    expect(updateResult).toEqual(newThing);
    const updatedSelectResult = await testDao.selectQuery(myString);
    expect(updatedSelectResult).toEqual(newThing);
    const deleteResult = await testDao.deleteQuery(myString);
    expect(deleteResult).toBeUndefined();
    const deletedSelectResult = await testDao.selectQuery(myString);
    expect(deletedSelectResult).toBeUndefined();
  });

  it("should return nothing for a SELECT of a non-existent record", async () => {
    const testDao = new TestDao(sequelize);
    const result = await testDao.selectQuery(randomstring.generate());
    expect(result).toBeUndefined();
  });

  it("should return nothing for an UPDATE of a non-existent record", async () => {
    const testDao = new TestDao(sequelize);
    const result = await testDao.updateQuery(1, randomstring.generate());
    expect(result).toBeUndefined();
  });

  it("should return nothing for a BULK_UPDATE of non-existent records", async () => {
    const testDao = new TestDao(sequelize);
    const result = await testDao.bulkUpdateMultipleThingsQuery(1, randomstring.generate(), randomstring.generate());
    expect(result).toBeUndefined();
  });

  it("should return nothing for a DELETE of a non-existent record", async () => {
    const testDao = new TestDao(sequelize);
    const result = await testDao.deleteQuery(randomstring.generate());
    expect(result).toBeUndefined();
  });

  it("should return a list when multiple rows are SELECTed", async () => {
    const lolDao = new LolDao(sequelize);
    const string1 = "abc123";
    const string2 = "def456";
    await lolDao.insertLol({ someString: string1 });
    await lolDao.insertLol({ someString: string2 });
    const result = await lolDao.getMultipleLols(string1, string2);
    expect(result).toEqual(List.of({ someString: string1 }, { someString: string2 }));
  });

  it("should return a list when multiple rows are UPDATEd", async () => {
    const testDao = new TestDao(sequelize);
    const thing1: Thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    const thing2: Thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    await testDao.insertQuery(thing1);
    await testDao.insertQuery(thing2);
    const newNumber = randomInt();
    const result = await testDao.updateMultipleThingsQuery(newNumber, thing1.someString, thing2.someString);
    expect(result).toEqual(List.of({ ...thing1, someInt: newNumber }, { ...thing2, someInt: newNumber }));
    const updatedThing1 = await testDao.selectQuery(thing1.someString);
    const updatedThing2 = await testDao.selectQuery(thing2.someString);
    expect(updatedThing1).toEqual({ ...thing1, someInt: newNumber });
    expect(updatedThing2).toEqual({ ...thing2, someInt: newNumber });
  });

  it("should allow us to BULK_UPDATE", async () => {
    const testDao = new TestDao(sequelize);
    const thing1: Thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    const thing2: Thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    await testDao.insertQuery(thing1);
    await testDao.insertQuery(thing2);
    const newNumber = randomInt();
    const result = await testDao.bulkUpdateMultipleThingsQuery(newNumber, thing1.someString, thing2.someString);
    expect(result).toBeUndefined();
    const updatedThing1 = await testDao.selectQuery(thing1.someString);
    const updatedThing2 = await testDao.selectQuery(thing2.someString);
    expect(updatedThing1).toEqual({ ...thing1, someInt: newNumber });
    expect(updatedThing2).toEqual({ ...thing2, someInt: newNumber });
  });

  it("should allow us to BULK_DELETE", async () => {
    const testDao = new TestDao(sequelize);
    const thing1: Thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    const thing2: Thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    await testDao.insertQuery(thing1);
    await testDao.insertQuery(thing2);
    const result = await testDao.deleteMultipleThingsQuery(thing1.someString, thing2.someString);
    expect(result).toBeUndefined();
    const updatedThing1 = await testDao.selectQuery(thing1.someString);
    const updatedThing2 = await testDao.selectQuery(thing2.someString);
    expect(updatedThing1).toBeUndefined();
    expect(updatedThing2).toBeUndefined();
  });

  it("should return an empty list when a SELECT of multiple rows returns none", async () => {
    const lolDao = new LolDao(sequelize);
    const result = await lolDao.getMultipleLols(randomstring.generate(), randomstring.generate());
    expect(result).toEqual(List());
  });

  it("should run the same results for a query that is executed twice (second run hits the query cache)", async () => {
    const testDao = new TestDao(sequelize);
    const thing: Thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    await testDao.insertQuery(thing);
    const selectedThing1 = await testDao.selectQuery(thing.someString);
    const selectedThing2 = await testDao.selectQuery(thing.someString);
    expect(selectedThing1).toEqual(thing);
    expect(selectedThing2).toEqual(thing);
  });

  it("should work for class instances and lists of class instances", async () => {
    const classDao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    const lol1 = await classDao.insertTestClazz(instance1);
    expect(lol1).toEqual(instance1);
    const lol2 = await classDao.insertTestClazz(instance2);
    expect(lol2).toEqual(instance2);
    const result = await classDao
      .getMultipleTestClazzes(instance1.someString, instance2.someString)
      .then((response) => response.sort((l, r) => l.someString.localeCompare(r.someString)));
    expect(result).toEqual(
      List.of(instance1, instance2).sort((a, b) => a.someString.localeCompare(b.someString))
    );
    expect(result.map((a) => a.testFunction())).toEqual(List.of("test", "test"));
  });

  it("should work for updates of class instances", async () => {
    const classDao = new ClazzDao(sequelize);
    const instance = new TestClazz(randomstring.generate(), randomFloat());
    await classDao.insertTestClazz(instance);
    const newNumber = randomFloat();
    const result = await classDao.updateTestClazz(newNumber, instance.someString);
    expect(result).toEqual({ ...instance, someNumber: newNumber });
  });

  it("should work for bulk updates of class instances", async () => {
    const classDao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    await classDao.insertTestClazz(instance1);
    await classDao.insertTestClazz(instance2);
    const newNumber = randomFloat();
    const result = await classDao.bulkUpdateManyTestClazzes(newNumber, instance1.someString, instance2.someString);
    expect(result).toBeUndefined();
    const updatedInstance1 = await classDao.getTestClazz(instance1.someString);
    const updatedInstance2 = await classDao.getTestClazz(instance2.someString);
    expect(updatedInstance1).toEqual({ ...instance1, someNumber: newNumber });
    expect(updatedInstance2).toEqual({ ...instance2, someNumber: newNumber });
  });

  it("should work for standard updates of multiple records", async () => {
    const classDao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    await classDao.insertTestClazz(instance1);
    await classDao.insertTestClazz(instance2);
    const newNumber = randomFloat();
    const result = await classDao.updateManyTestClazzes(newNumber, instance1.someString, instance2.someString);
    expect(result).toEqual(List.of({ ...instance1, someNumber: newNumber }, { ...instance2, someNumber: newNumber }));
  });

  it("should propagate errors from the database", async () => {
    const testDao = new TestDao(sequelize);
    const thing: Thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    await testDao.insertQuery(thing);
    await expect(async () => testDao.insertQuery(thing)).rejects.toThrow();
  });

  it("should throw exceptions when there is no resolvable file or query reference", async () => {
    const brokenDao = new BrokenDao(sequelize);
    await brokenDao.insertBrokenType({ someString: randomstring.generate() });
    await expect(async () => brokenDao.noFileOrQueryReference({ someString: randomstring.generate() })).rejects.toThrow();
  });

  it("should work for unconventional field names", async () => {
    const unconventionalDao = new UnconventionalDao(sequelize);
    const unconventionalFields = {
      some1Name2With3Numbers4Intertwined: randomstring.generate(),
      someNameEndingInANumber1: randomstring.generate()
    };
    await unconventionalDao.insertUnconventionalType(unconventionalFields);
    const selectResult = await unconventionalDao.selectUnconventionalType();
    expect(selectResult).toEqual(unconventionalFields);
  });

  it("should throw exceptions when it attempts to parse the results into a list without specifying the returnList argument in QueryOptions", async () => {
    const brokenDao = new BrokenDao(sequelize);
    await brokenDao.insertBrokenType({ someString: randomstring.generate() });
    await brokenDao.insertBrokenType({ someString: randomstring.generate() });
    await expect(async () => brokenDao.listNeededWithoutSettingListReturn()).rejects.toThrow();
  });

  it("should throw exceptions when parameters in the query are mapped incorrectly", async () => {
    const brokenDao = new BrokenDao(sequelize);
    await brokenDao.insertBrokenType({ someString: randomstring.generate() });
    await expect(async () => brokenDao.incorrectParameterMapping(randomInt(), randomstring.generate())).rejects.toThrow();
  });

  it("should work with coalescing undefined replacements in UPDATE", async () => {
    const testDao = new TestDao(sequelize);
    const thing: Thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    await testDao.insertQuery(thing);
    const updatedThing = await testDao.updateQuery(undefined, thing.someString);
    expect(updatedThing).toEqual(thing);
  });

  it("should let us insert with undefined fields", async () => {
    const nullableDao = new NullableDao(sequelize);
    const record: NullableRecord = { someId: randomstring.generate(), someNullableString: undefined, someNullableNumber: undefined };
    const result = await nullableDao.insertNullableRecord(record);
    expect(result).toEqual(record);
  });

  it("should let us select records with undefined fields", async () => {
    const nullableDao = new NullableDao(sequelize);
    const record: NullableRecord = { someId: randomstring.generate(), someNullableString: undefined, someNullableNumber: undefined };
    await nullableDao.insertNullableRecord(record);
    const result = await nullableDao.selectNullableRecord(record.someId);
    expect(result).toEqual(record);
  });

  it("should work for records with enums", async () => {
    const enumDao = new EnumDao(sequelize);
    const record: EnumRecord = { someId: randomstring.generate(), someEnum: SomeEnum.A };
    const result = await enumDao.insertEnumRecordTransactionally(record);
    expect(result).toEqual(record);
    const selectedRecord = await enumDao.selectEnumRecord(record.someId);
    expect(selectedRecord).toEqual(record);
  });

  it("should execute multiple queries in a transaction", async () => {
    const dao = new EnumDao(sequelize);
    const thing1: EnumRecord = { someId: randomstring.generate(), someEnum: SomeEnum.A };
    const thing2: EnumRecord = { someId: randomstring.generate(), someEnum: SomeEnum.B };
    const insertResult = await dao.insertManyTransactionally(List.of(thing1, thing2));
    expect(insertResult.toSet()).toEqual(Set.of(thing1, thing2));
    const selectedThing1 = await dao.selectEnumRecord(thing1.someId);
    const selectedThing2 = await dao.selectEnumRecord(thing2.someId);
    expect(selectedThing1).toEqual(thing1);
    expect(selectedThing2).toEqual(thing2);
  });

  it("should let me execute a query that has the option of being transactional, but without a transaction", async () => {
    const dao = new EnumDao(sequelize);
    const thing1: EnumRecord = { someId: randomstring.generate(), someEnum: SomeEnum.A };
    const insertResult1 = await dao.insertEnumRecordTransactionally(thing1);
    expect(insertResult1).toEqual(thing1);
  });

  it("should rollback a transaction if one of the queries fails", async () => {
    const dao = new EnumDao(sequelize);
    const thing1: EnumRecord = { someId: randomstring.generate(), someEnum: SomeEnum.A };
    const thing2: EnumRecord = { someId: randomstring.generate(), someEnum: SomeEnum.B };
    await expect(async () => dao.insertManyTransactionally(List.of(thing1, thing2, thing1))).rejects.toThrow();
    const selectedThing1 = await dao.selectEnumRecord(thing1.someId);
    const selectedThing2 = await dao.selectEnumRecord(thing2.someId);
    expect(selectedThing1).toBeUndefined();
    expect(selectedThing2).toBeUndefined();
  });

  it("should let us get results from json_agg", async () => {
    const dao = new NestedDao(sequelize);
    const nested = new Nested(randomstring.generate());
    const subType = new SubType(randomstring.generate());
    const nestedInsertionResult = await dao.insertNested(nested);
    const subTypeInsertionResult = await dao.insertSubType(subType);
    const singleNestedSelectResult = await dao.getNested(nestedInsertionResult.id);
    expect(singleNestedSelectResult).toEqual(new Nested(nestedInsertionResult.id, [subType]));
    const newNested = await dao.insertNested(new Nested(randomstring.generate()));
    const newSubType = await dao.insertSubType(new SubType(randomstring.generate()));
    const multiNestedSelectResult = await dao.getMultipleNesteds();
    expect(multiNestedSelectResult).toEqual(
      List.of(
        new Nested(nestedInsertionResult.id, [subType, newSubType]),
        new Nested(newNested.id, [subType, newSubType])
      )
    );
  });

  it("should work for empty sub-arrays", async () => {
    const dao = new NestedDao(sequelize);
    const nested = new Nested(randomstring.generate());
    const subType = new SubType(randomstring.generate());
    await dao.insertNested(nested);
    await dao.insertSubType(subType);
    const specificNestedResult = await dao.getSpecificNested(nested.id, randomstring.generate());
    expect(specificNestedResult).toEqual(nested);
  });

  it("should work for upserts", async () => {
    const dao = new TestDao(sequelize);
    const thing = { someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() };
    const inserted = await dao.upsertQueryWithReturn(thing.someString, thing.someNumber, thing.someInt);
    expect(inserted).toEqual(thing);
    const fetchedInserted = await dao.selectQuery(thing.someString);
    expect(fetchedInserted).toEqual(thing);
    const updated = await dao.upsertQueryWithReturn(thing.someString, thing.someNumber, thing.someInt + 1);
    const expectedNewThing = { ...thing, someInt: thing.someInt + 1 };
    expect(updated).toEqual(expectedNewThing);
    const fetchedUpdated = await dao.selectQuery(thing.someString);
    expect(fetchedUpdated).toEqual(expectedNewThing);
  });

  it("should return an async iterable of a query", async () => {
    const dao = new TestDao(sequelize);
    const min = Math.round(Math.random() * 1000000 + 10000000);
    const max = min + 100;
    for (let i = min; i < max; i++) {
      await dao.insertQuery({ someString: randomstring.generate(), someNumber: randomFloat(10000), someInt: i });
    }
    const iterator = dao.iterator(min, max);
    let count = 0;
    for (let i = min; i < max; i++) {
      const next = await iterator.next();
      expect(next.value).toEqual({ someString: expect.any(String), someNumber: expect.any(Number), someInt: i });
      count++;
    }
    expect(count).toEqual(max - min);
  });

  it("should return iterators when a class is specified", async () => {
    const dao = new ClazzDao(sequelize);
    await dao.insertTestClazz(new TestClazz(randomstring.generate(), randomFloat()));
    let items: List<TestClazz> = List.of();
    for await (const item of dao.iterator()) {
      items = items.push(item);
    }
    expect(items.size).toBeGreaterThanOrEqual(1);
  });

  it("should handle no results in a stream gracefully", async () => {
    const dao = new TestDao(sequelize);
    const iterator = dao.iterator(0, 0);
    let count = 0;
    for await (const item of iterator) {
      count++;
    }
    expect(count).toEqual(0);
  });

  it("should allow for streaming from a sql file", async () => {
    const dao = new TestDao(sequelize);
    await dao.insertQuery({ someString: randomstring.generate(), someNumber: randomFloat(), someInt: randomInt() });
    const iterator = dao.streamThings(0, Number.MAX_SAFE_INTEGER);
    let count = 0;
    for await (const item of iterator) {
      count++;
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("should return bool results", async () => {
    const dao = new TestDao(sequelize);
    const bool = await dao.booleanResult();
    expect(bool.result).toEqual(true);
  });

  it("should return string results", async () => {
    const dao = new TestDao(sequelize);
    const str = await dao.stringResult();
    expect(str.result).toEqual("lol");
  });

  it("should return number results", async () => {
    const dao = new TestDao(sequelize);
    const num = await dao.numberResult();
    expect(num.result).toEqual(1);
  });

  it("should let me group array values into an `IN` clause with strings", async () => {
    const dao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    await dao.insertTestClazz(instance1);
    await dao.insertTestClazz(instance2);
    const result = await dao.getGroupedTestClazzesByString([instance1.someString, instance2.someString]);
    expect(Set.of(...result)).toEqual(Set.of(instance1, instance2));
  });

  it("should let me group array values into an `IN` clause with numbers", async () => {
    const dao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    await dao.insertTestClazz(instance1);
    await dao.insertTestClazz(instance2);
    const result = await dao.getGroupedTestClazzesByNumber([instance1.someNumber, instance2.someNumber]);
    expect(Set.of(...result)).toEqual(Set.of(instance1, instance2));
  });

  it("should let me pass undefined to avoid the IN clause", async () => {
    const dao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    const lol1 = await dao.insertTestClazz(instance1);
    const lol2 = await dao.insertTestClazz(instance2);
    const result = await dao.getGroupedTestClazzesByString(undefined);
    expect(result.toArray()).toContainEqual(lol1);
    expect(result.toArray()).toContainEqual(lol2);
  });

  it("should let me group array values into an `IN` clause with strings in a complex type", async () => {
    const dao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    await dao.insertTestClazz(instance1);
    await dao.insertTestClazz(instance2);
    const result = await dao.getGroupedTestClazzes({ queryStrings: [instance1.someString, instance2.someString], queryNumbers: undefined });
    expect(Set.of(...result)).toEqual(Set.of(instance1, instance2));
  });

  it("should let me group array values into an `IN` clause with numbers in a complex type", async () => {
    const dao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    await dao.insertTestClazz(instance1);
    await dao.insertTestClazz(instance2);
    const result = await dao.getGroupedTestClazzes({ queryStrings: undefined, queryNumbers: [instance1.someNumber, instance2.someNumber] });
    expect(Set.of(...result)).toEqual(Set.of(instance1, instance2));
  });

  it("should let me group multiple array values into separate `IN` clauses with numbers and strings in a complex type", async () => {
    const dao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    const instance3 = new TestClazz(randomstring.generate(), randomFloat());
    const instance4 = new TestClazz(randomstring.generate(), randomFloat());
    await dao.insertTestClazz(instance1);
    await dao.insertTestClazz(instance2);
    await dao.insertTestClazz(instance3);
    await dao.insertTestClazz(instance4);
    const result = await dao.getGroupedTestClazzes({ queryStrings: [instance1.someString, instance2.someString], queryNumbers: [instance1.someNumber] });
    expect(Set.of(...result)).toEqual(Set.of(instance1));
  });

  it("should let me `IN` clauses in StreamSelect", async () => {
    const dao = new ClazzDao(sequelize);
    const instance1 = new TestClazz(randomstring.generate(), randomFloat());
    const instance2 = new TestClazz(randomstring.generate(), randomFloat());
    const instance3 = new TestClazz(randomstring.generate(), randomFloat());
    const instance4 = new TestClazz(randomstring.generate(), randomFloat());
    const lol1 = await dao.insertTestClazz(instance1);
    const lol2 = await dao.insertTestClazz(instance2);
    const lol3 = await dao.insertTestClazz(instance3);
    await dao.insertTestClazz(instance4);
    const resultStream = dao.streamWithInClause([instance1.someString, instance2.someString, instance3.someString]);
    const results = [];
    for await (const result of resultStream) {
      results.push(result);
    }
    expect(Set.of(...results)).toEqual(Set.of(lol1, lol2, lol3));
  });

  it("should insert and retrieve array fields", async () => {
    const tags = ["lol1", "lol2", "lol3"];
    const arrayDao = new ArrayDao(sequelize);
    await arrayDao.insertArray1(tags);
    const selectResult = await arrayDao.findArray1ByTag("lol2");
    expect(selectResult.result).toEqual(expect.arrayContaining(tags));
  });

  it("should insert and retrieve empty array fields", async () => {
    const tags: string[] = [];
    const arrayDao = new ArrayDao(sequelize);
    const inserted = await arrayDao.insertArray1(tags);
    const selectResult = await arrayDao.findArray1ById(inserted.someId);
    expect(selectResult.result).toEqual(expect.arrayContaining([]));
  });

  it("should retrieve null array fields", async () => {
    const arrayDao = new ArrayDao(sequelize);
    const inserted = await arrayDao.insertArray1(["abc", "123"]);
    const selectResult = await arrayDao.findArray2ById(inserted.someId);
    expect(selectResult.result).toBeUndefined();
  });

  it("should update and retrieve updated array data fields", async () => {
    const tags = ["lol4", "lol5"];
    const arrayDao = new ArrayDao(sequelize);
    const inserted = await arrayDao.insertArray1(tags);
    const selectResult = await arrayDao.findArray1ByTag("lol4");
    expect(selectResult.result).toEqual(expect.arrayContaining(tags));
    const newTags = ["lol6", "lol7", "lol8"];
    await arrayDao.concatArray1(inserted.someId, newTags);
    const updated = await arrayDao.findArray1ByTag("lol7");
    expect(updated.result).toEqual(expect.arrayContaining([...tags, ...newTags]));
  });

  it("should let me overwrite array fields to empty", async () => {
    const tags = ["lol4", "lol5"];
    const arrayDao = new ArrayDao(sequelize);
    const inserted = await arrayDao.insertArray1(tags);
    const overwriteResult = await arrayDao.overwriteArray1(inserted.someId, []);
    expect(overwriteResult.someArray1).toHaveLength(0);
  });

  it("should insert and retrieve JSONB array fields using stringified JSON", async () => {
    const jsonObjects = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
      { name: "Charlie", age: 35, nested: { city: "NYC" } }
    ];
    const jsonArrayString = JSON.stringify(jsonObjects);
    const arrayDao = new ArrayDao(sequelize);
    const inserted = await arrayDao.insertJsonbArray(jsonArrayString);
    const selectResult = await arrayDao.findJsonbArrayById(inserted.someId);
    expect(selectResult.result).toEqual(jsonObjects);
  });

  it("should insert and retrieve empty JSONB array fields", async () => {
    const jsonObjects: object[] = [];
    const jsonArrayString = JSON.stringify(jsonObjects);
    const arrayDao = new ArrayDao(sequelize);
    const inserted = await arrayDao.insertJsonbArray(jsonArrayString);
    const selectResult = await arrayDao.findJsonbArrayById(inserted.someId);
    expect(selectResult.result).toEqual([]);
  });

  it("should let me insert records with a field specified as a getter", async () => {
    const dao = new ClazzDao(sequelize);
    const clazz = new TestClazzWithGetter(randomstring.generate());
    const inserted = await dao.insertTestGetterValue(clazz);
    const result = await dao.selectTestGetterValue(inserted.someString);
    expect(result.result).toEqual(TEST_GETTER_VALUE);
  });

  it("should let me upsert", async () => {
    const testDao = new TestDao(sequelize);
    const name = randomstring.generate();
    const thing1: Thing = { someString: name, someNumber: randomFloat(), someInt: randomInt() };
    await testDao.upsertQuery(thing1);
    const inserted = await testDao.selectQuery(name);
    expect(inserted).toEqual(thing1);
    const thing2: Thing = { someString: name, someNumber: randomFloat(), someInt: randomInt() };
    await testDao.upsertQuery(thing2);
    const upserted = await testDao.selectQuery(name);
    expect(upserted).toEqual(thing2);
  });

  it("should let me do a multi-row commit in a SQL transaction across multiple DAOs", async () => {
    const lolDao = new LolDao(sequelize);
    const enumDao = new EnumDao(sequelize);
    const testRepository = new TestRepository(sequelize, lolDao, enumDao);
    const lolId = randomstring.generate();
    const enumId = randomstring.generate();
    const result = await testRepository.insertLolsAndEnumsInTransaction(
      { someString: lolId },
      { someId: enumId, someEnum: SomeEnum.A }
    );
    expect(result.lolRecord.someString).toEqual(lolId);
    expect(result.enumRecord.someId).toEqual(enumId);
  });

  it("should handle rollbacks in the repository layer", async () => {
    const lolDao = new LolDao(sequelize);
    const enumDao = new EnumDao(sequelize);
    const testRepository = new TestRepository(sequelize, lolDao, enumDao);
    const lolRecord = { someString: randomstring.generate() };
    await testRepository.triggerRollback(lolRecord).catch((_): void => null);
    const result = await lolDao.getLol(lolRecord.someString);
    expect(result).toBeUndefined();
  });

  it("should error if you try to get too fancy with nested transactions", async () => {
    const lolDao = new LolDao(sequelize);
    const enumDao = new EnumDao(sequelize);
    const testRepository = new TestRepository(sequelize, lolDao, enumDao);
    await testRepository
      .nestedTransaction()
      .then((_) => unreachableErr())
      .catch((err) => expect(err).toBeDefined());
  });
});

function randomInt(): number {
  return parseInt(randomstring.generate({ length: 5, charset: "numeric" }));
}

function randomFloat(scalar = 5): number {
  return Math.random() * scalar;
}
