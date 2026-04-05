import { Dao, DaoBase, SqlQuery } from "@zeroshotbuilders/sql-decorators";
import { QueryTypes } from "sequelize";

export type BrokenType = {
  someString: string;
};

@Dao()
export class BrokenDao extends DaoBase {
  @SqlQuery<BrokenType>({
    queryType: QueryTypes.INSERT,
    query: "INSERT INTO broken (some_string) VALUES (:someString) RETURNING *"
  })
  insertBrokenType(brokenType: BrokenType): Promise<BrokenType> {
    return null;
  }

  @SqlQuery<BrokenType>({
    queryType: QueryTypes.INSERT
  })
  noFileOrQueryReference(lol: BrokenType): Promise<BrokenType> {
    return null;
  }

  @SqlQuery<BrokenType>({
    queryType: QueryTypes.UPDATE,
    query:
      "UPDATE broken set some_number = :someNumber WHERE some_string = :lookupString RETURNING *"
  })
  incorrectParameterMapping(
    newNumber: number,
    lookupString: string
  ): Promise<BrokenType> {
    return null;
  }

  @SqlQuery<BrokenType>({
    queryType: QueryTypes.UPDATE,
    query: "SELECT * from broken"
  })
  listNeededWithoutSettingListReturn(): Promise<BrokenType> {
    return null;
  }
}
