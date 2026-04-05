---
name: testing-guide
description: Reference guide for writing integration and unit tests
---

Reference guide for writing integration and unit tests.

Read these docs for full details:
- `.ai/testing.md` for integration test structure, unit tests, and testcontainers
- `.ai/configuration.md` for dynamic config and overriding config in tests

## Quick Reference

### Integration Test Structure
- Boot dependencies via testcontainers (`PostgresContainer`, `RedisContainer` from `@zeroshotbuilders/commons-testing`)
- Wire into a NestJS test module using `.overrideProvider()`
- Run assertions against the real stack

### Testcontainers
```ts
import { PostgresContainer, RedisContainer } from "@zeroshotbuilders/commons-testing";

const postgresContainer = new PostgresContainer();
await postgresContainer.start();

const redisContainer = new RedisContainer();
await redisContainer.start();
```

### Overriding Config in Tests
```ts
const testModule = await Test.createTestingModule({
  imports: [ServiceModule],
})
  .overrideProvider(RedisConnectionConfig)
  .useValue(redisContainer.getConnectionConfig())
  .overrideProvider(PostgresConnectionConfig)
  .useValue(postgresContainer.getConnectionConfig())
  .compile();
```

### Dynamic Config in Tests
```ts
const original = dynamicConfig.getX();
try {
  dynamicConfig.setX(testValue);
  // test logic
} finally {
  dynamicConfig.setX(original);
}
```

### Unit Tests
Required for all utility functions, especially in `packages/commons`.
Good example: `packages/commons/test/port/port-utils.spec.ts`.

$ARGUMENTS
