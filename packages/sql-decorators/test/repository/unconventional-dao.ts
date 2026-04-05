import { Dao, DaoBase, SqlQuery } from "@zeroshotbuilders/sql-decorators";
import { QueryTypes } from "sequelize";

export type UnconventionalType = {
  some1Name2With3Numbers4Intertwined: string;
  someNameEndingInANumber1: string;
};

@Dao()
export class UnconventionalDao extends DaoBase {
  @SqlQuery<UnconventionalType>({
    queryType: QueryTypes.INSERT,
    query:
      "INSERT INTO unconventional (some_1_name_2_with_3_numbers_4_intertwined, some_name_ending_in_a_number_1) VALUES (:some1Name2With3Numbers4Intertwined, :someNameEndingInANumber1) RETURNING *"
  })
  insertUnconventionalType(
    unconventionalType: UnconventionalType
  ): Promise<UnconventionalType> {
    return null;
  }

  @SqlQuery<UnconventionalType>({
    queryType: QueryTypes.SELECT,
    query: "SELECT * FROM unconventional"
  })
  selectUnconventionalType(): Promise<UnconventionalType> {
    return null;
  }
}
