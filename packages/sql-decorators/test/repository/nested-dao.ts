import { Dao, SqlQuery } from "@zeroshotbuilders/sql-decorators";
import { List } from "immutable";
import { QueryTypes, Sequelize } from "sequelize";

export class SubType {
  constructor(public readonly name: string) {}
}

export class Nested {
  constructor(
    public readonly id: string,
    public readonly someArrayField?: SubType[]
  ) {}
}

@Dao()
export class NestedDao {
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  @SqlQuery<Nested>({
    queryType: QueryTypes.INSERT,
    query: "INSERT INTO nested (id) VALUES (:id) RETURNING *"
  })
  insertNested(nested: Nested): Promise<Nested> {
    return null;
  }

  @SqlQuery<SubType>({
    queryType: QueryTypes.INSERT,
    query: "INSERT INTO sub_type (name) VALUES (:name) RETURNING *"
  })
  insertSubType(subType: SubType): Promise<SubType> {
    return null;
  }

  @SqlQuery<Nested>({
    queryType: QueryTypes.SELECT,
    query:
      "SELECT nested.*, (\n" +
      "  SELECT json_agg(sub_type.*)\n" +
      "  FROM sub_type\n" +
      ") as some_array_field\n" +
      "FROM nested WHERE nested.id = :id"
  })
  getNested(id: string): Promise<Nested> {
    return null;
  }

  @SqlQuery<Nested>({
    queryType: QueryTypes.SELECT,
    query:
      "SELECT nested.*, (\n" +
      "  SELECT json_agg(sub_type.*)\n" +
      "  FROM sub_type\n" +
      "  WHERE sub_type.name = :name\n" +
      ") as some_array_field\n" +
      "FROM nested WHERE nested.id = :id"
  })
  getSpecificNested(id: string, name: string): Promise<Nested> {
    return null;
  }

  @SqlQuery<Nested>({
    queryType: QueryTypes.SELECT,
    returnList: true,
    query:
      "SELECT nested.*, (\n" +
      "  SELECT json_agg(sub_type.*)\n" +
      "  FROM sub_type\n" +
      ") as some_array_field\n" +
      "FROM nested"
  })
  getMultipleNesteds(): Promise<List<Nested>> {
    return null;
  }
}
