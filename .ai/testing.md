# Testing

## Integration Tests

Integration tests in build-kit use testcontainers to boot real dependencies (Postgres, Redis) and validate packages
end-to-end.

Test structure:
- Boot dependencies via testcontainers
- Wire them into a NestJS test module
- Run assertions against the real stack

## Unit Tests

We use unit tests for testing smaller units of code. If we ever create a utility function, especially one that lives in
a common place (like `commons`), then we must have unit tests.

A good example: `packages/commons/test/port/port-utils.spec.ts`.

## Testcontainers

`packages/commons-testing` provides testcontainer utilities for spinning up real Postgres and Redis instances in tests:

```ts
const postgresContainer = new PostgresContainer();
await postgresContainer.start();

const redisContainer = new RedisContainer();
await redisContainer.start();
```

These containers provide connection configs that can be injected into NestJS test modules.

## Overriding Configuration in Tests

Override configuration by injecting values into NestJS test modules:

```ts
const testModule = await Test.createTestingModule({
  imports: [ServiceModule],
})
  .overrideProvider(RedisConnectionConfig)
  .useValue(redisContainer.getConnectionConfig())
  .overrideProvider(PostgresConnectionConfig)
  .useValue(postgresContainer.getConnectionConfig())
  .compile();
await testModule.init();
```

This skips `loadConfig` entirely and injects specific objects into the NestJS dependency graph.

## Dynamic Configuration in Tests

`*DynamicConfig` classes expose getter/setter methods so tests can override values at runtime:

1. Fetch the dynamic config from the test module
2. Override in tests with cleanup:
   - Read original value via getter
   - Set temporary test value via setter
   - In `finally`, restore the original value

Always save and restore original values using `try/finally`.

## Third-Party API Mocking

Third-party `*-utils` packages can have local implementations for testing. The local implementation exposes `static`
methods so tests can change or access mock state:

```ts
await ExampleServiceLocal.updateStatus(id, "Active");
await eventually(async () => {
  // assert the service synced the change
});
```
