import { ArrayResult, Dao, DaoBase, SqlQuery } from "@zeroshotbuilders/sql-decorators";
import { QueryTypes } from "sequelize";

export type SomeArrayResult = {
  someId: string;
  someArray1: string[];
  someArray2: string[];
};

export type JsonbArrayResult = {
  result: object[] | undefined;
};

@Dao()
export class ArrayDao extends DaoBase {
  @SqlQuery<{ some_id: string }>({
    queryType: QueryTypes.INSERT,
    query: `
        INSERT INTO array_table (some_array_1)
        VALUES (COALESCE(ARRAY [:someArray1]::varchar[], ARRAY []::varchar[]))
        RETURNING some_id;
    `
  })
  insertArray1(someArray1: string[]): Promise<{ someId: string }> {
    return null;
  }

  @SqlQuery<ArrayResult>({
    queryType: QueryTypes.SELECT,
    query:
      "SELECT some_array_1 as result FROM array_table WHERE some_array_1 @> ARRAY[:tag]::VARCHAR[];"
  })
  findArray1ByTag(tag: string): Promise<ArrayResult> {
    return null;
  }

  @SqlQuery<ArrayResult>({
    queryType: QueryTypes.SELECT,
    query: "SELECT some_array_1 as result FROM array_table WHERE some_id = :id;"
  })
  findArray1ById(id: string): Promise<ArrayResult> {
    return null;
  }

  @SqlQuery<ArrayResult>({
    queryType: QueryTypes.SELECT,
    query: "SELECT some_array_2 as result FROM array_table WHERE some_id = :id;"
  })
  findArray2ById(id: string): Promise<ArrayResult> {
    return null;
  }

  @SqlQuery<void>({
    queryType: QueryTypes.UPDATE,
    query: `
        UPDATE array_table
        SET some_array_1 = array_cat(some_array_1, ARRAY [:newTags]::varchar[])
        WHERE some_id = :id;
    `
  })
  concatArray1(id: string, newTags: string[]): Promise<void> {
    return null;
  }

  @SqlQuery<SomeArrayResult>({
    queryType: QueryTypes.UPDATE,
    query: `
        UPDATE array_table
        SET some_array_1 = COALESCE(ARRAY [:someArray1]::varchar[], ARRAY []::varchar[])
        WHERE some_id = :id
        RETURNING *;
    `
  })
  overwriteArray1(id: string, someArray1: string[]): Promise<SomeArrayResult> {
    return null;
  }

  @SqlQuery<{ some_id: string }>({
    queryType: QueryTypes.INSERT,
    query: `
        INSERT INTO array_table (some_jsonb_array)
        VALUES (ARRAY(SELECT jsonb_array_elements(:jsonArrayString::JSONB)))
        RETURNING some_id;
    `
  })
  insertJsonbArray(jsonArrayString: string): Promise<{ someId: string }> {
    return null;
  }

  @SqlQuery<JsonbArrayResult>({
    queryType: QueryTypes.SELECT,
    query:
      "SELECT some_jsonb_array as result FROM array_table WHERE some_id = :id;"
  })
  findJsonbArrayById(id: string): Promise<JsonbArrayResult> {
    return null;
  }
}
