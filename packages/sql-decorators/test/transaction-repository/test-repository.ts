import {
  SqlTransaction,
  TransactionalityBase,
  WithTransactionality
} from "@zeroshotbuilders/sql-decorators";
import { List } from "immutable";
import * as randomstring from "randomstring";
import { Sequelize, Transaction } from "sequelize";
import { EnumDao, EnumRecord, SomeEnum } from "../repository/enum-dao";
import { Lol, LolDao } from "../repository/lol-dao";

@WithTransactionality()
export class TestRepository extends TransactionalityBase {
  constructor(
    sequelize: Sequelize,
    private readonly lolDao: LolDao,
    private readonly enumDao: EnumDao
  ) {
    super(sequelize);
  }

  @SqlTransaction()
  public async insertLolsAndEnumsInTransaction(
    lolRecord: Lol,
    enumRecord: EnumRecord,
    transaction?: Transaction
  ): Promise<{ lolRecord: Lol; enumRecord: EnumRecord }> {
    const insertedEnumRecord =
      await this.enumDao.insertEnumRecordTransactionally(
        enumRecord,
        transaction
      );
    const insertedLolRecord = await this.lolDao.insertLolTransactionally(
      lolRecord,
      transaction
    );
    return {
      lolRecord: insertedLolRecord,
      enumRecord: insertedEnumRecord
    };
  }

  @SqlTransaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    type: Transaction.TYPES.IMMEDIATE
  })
  public async nestedTransaction(
    transaction?: Transaction
  ): Promise<List<EnumRecord>> {
    return this.enumDao.insertManyTransactionally(
      List.of(
        {
          someId: randomstring.generate(),
          someEnum: SomeEnum.A
        },
        {
          someId: randomstring.generate(),
          someEnum: SomeEnum.B
        }
      ),
      transaction
    );
  }

  @SqlTransaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    type: Transaction.TYPES.IMMEDIATE
  })
  public async triggerRollback(
    lolRecord: Lol,
    transaction?: Transaction
  ): Promise<Lol> {
    // Should get rolled back
    const insertedLolRecord = await this.lolDao.insertLolTransactionally(
      lolRecord,
      transaction
    );
    const repeatedId = randomstring.generate();
    const insertedEnumRecord =
      await this.enumDao.insertEnumRecordTransactionally(
        { someId: repeatedId, someEnum: SomeEnum.A },
        transaction
      );
    // Should fail on duplicate PK
    const failedEnumRecord = await this.enumDao.insertEnumRecordTransactionally(
      { someId: repeatedId, someEnum: SomeEnum.B },
      transaction
    );
    return insertedLolRecord;
  }
}
