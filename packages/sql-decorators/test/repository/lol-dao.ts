import { Dao, SqlQuery } from "@zeroshotbuilders/sql-decorators";
import { List } from "immutable";
import { QueryTypes, Sequelize, Transaction } from "sequelize";

export type Lol = {
  someString: string;
};

@Dao()
export class LolDao {
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  @SqlQuery<Lol>({
    queryType: QueryTypes.INSERT,
    query: "INSERT INTO lol (some_string) VALUES (:someString) RETURNING *"
  })
  insertLol(lol: Lol): Promise<Lol> {
    return null;
  }

  @SqlQuery<Lol>({
    queryType: QueryTypes.INSERT,
    query: "INSERT INTO lol (some_string) VALUES (:someString) RETURNING *"
  })
  insertLolTransactionally(lol: Lol, transaction?: Transaction): Promise<Lol> {
    return null;
  }

  @SqlQuery<Lol>({
    queryType: QueryTypes.SELECT,
    query: `
        SELECT *
        FROM lol
        where some_string = :queryString
    `
  })
  getLol(queryString: string): Promise<Lol | undefined> {
    return null;
  }

  @SqlQuery<Lol>({
    queryType: QueryTypes.SELECT,
    returnList: true,
    query:
      "SELECT * FROM lol where some_string in (:queryString1, :queryString2) ORDER BY some_string ASC"
  })
  getMultipleLols(
    queryString1: string,
    queryString2: string
  ): Promise<List<Lol>> {
    return null;
  }
}
