# sql-decorators Framework

We have built a custom in-house framework for interacting with the SQL database. It allows us to use actual SQL queries.
The logic lives in the `sql-decorators` package. **100% of DML must use this `sql-decorators` construct.** The queries should all live
in a DAO.

The framework uses "sequelize" to actually execute the queries.

## Implementation Details

For implementation details, look at `packages/sql-decorators/src/decorators.ts`. This is where our main decorators live that
contain the logic for translating TypeScript functions on the DAO into actual SQL calls. It is also responsible for
running the actual underlying query and managing parameterized replacements.

For examples of how to use each decorator, look in `packages/sql-decorators/test`.

## Data Access Objects (DAOs)

A DAO encapsulates all interaction with a data source behind a clean interface. DAOs handle queries, inserts, updates,
deletes, and data-mapping so the rest of the application never deals directly with SQL, ORMs, or database drivers.

In a well-structured backend, services depend on DAOs rather than on raw database primitives.

## DAO Structure

```ts
@Dao({
  queryDirectory: `${__dirname}/queries`
})
export class NoteDao extends DaoBase {
  @SqlQuery<NoteModel>({
    queryType: QueryTypes.SELECT,
    clazz: NoteModel,
    returnList: true
  })
  getNotes(
    noteIds: string[] | undefined,
    customerIds: string[] | undefined
  ): Promise<List<NoteModel>> {
    return null;
  }
}
```

## Transactions

When you need to perform multiple inserts, mutations, or anything that would require a SQL Transaction, we have a
`@SqlTransaction` decorator. This generates a `Transaction` object that must be passed into each of the methods that
must be part of the same transaction.

Look in `packages/sql-decorators/test/repository/enum-dao.ts` for an example on how to do this.

## Streaming with @StreamSelect

The `@StreamSelect` decorator handles paginating through a database table for large result sets:

```typescript
@StreamSelect<TreatmentModel>({
  clazz: TreatmentModel,
  batchSize: 1000
})
streamTreatments(
  createdSince?: number | undefined
): StreamIterator<TreatmentModel> {
  return null; // Implementation is injected by the decorator
}
```

### How StreamSelect Works

- **Batching**: Executes the SQL query multiple times with `LIMIT` and `OFFSET` clauses.
- **Lazy Fetching**: Fetches the first `batchSize` records, then auto-fetches the next batch when consumed.
- **Termination**: Stops when a batch returns fewer records than `batchSize`.

### CRITICAL: Sort Order

Because `StreamSelect` relies on `LIMIT` and `OFFSET`, **the underlying SQL query MUST have a deterministic `ORDER BY`
clause.** Without it, records may be duplicated or skipped between batches.

**Always use a unique, immutable column (like `created_at`) in your `ORDER BY` clause for streaming.**

```sql
SELECT *
FROM treatments
WHERE (:createdSince IS NULL OR created_at > :createdSince)
ORDER BY created_at
```
